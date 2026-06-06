"""Orchestrate post-sync alerts and scheduled digests."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.benchmarks import build_benchmark_report
from app.metrics import build_overview
from app.models import Organization
from app.notification_settings import get_notification_settings
from app.notifications.content import build_budget_alert, month_to_date_spend_usd
from app.notifications.email import send_weekly_digest
from app.notifications.github_comments import post_pr_cost_comments
from app.notifications.inbox import build_inbox_summary
from app.notifications.slack import build_slack_blocks, post_slack_message
from app.org_profile import org_profile_payload

logger = logging.getLogger(__name__)


def list_all_org_ids(db: Session) -> list[str]:
    return [o.id for o in db.query(Organization).all()]


def _should_send_alert(last_alerts: dict, alert_key: str, *, cooldown_hours: int = 24) -> bool:
    raw = last_alerts.get(alert_key)
    if not raw:
        return True
    try:
        last = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - last > timedelta(hours=cooldown_hours)
    except (TypeError, ValueError):
        return True


def _mark_alert_sent(settings: dict, alert_key: str) -> dict:
    last = dict(settings.get("lastAlertsJson") or {})
    last[alert_key] = datetime.now(timezone.utc).isoformat()
    settings["lastAlertsJson"] = last
    return settings


def collect_alerts(
    db: Session,
    org_id: str,
    settings: dict,
    *,
    bench: dict | None = None,
) -> list[dict]:
    bench = bench or build_benchmark_report(db, org_id)
    alerts: list[dict] = []

    if settings.get("alertOnCpstSpike"):
        for a in bench.get("anomalies") or []:
            if a.get("severity") in ("high", "medium"):
                alerts.append({**a, "type": "cpst_spike"})

    if settings.get("alertOnBudgetBurn"):
        budget = float(settings.get("monthlyBudgetUsd") or 0)
        if budget > 0:
            mtd = month_to_date_spend_usd(db, org_id)
            burn = build_budget_alert(
                mtd_spend_usd=mtd,
                monthly_budget_usd=budget,
                threshold_pct=float(settings.get("budgetAlertThresholdPct") or 80),
            )
            if burn:
                alerts.append(burn)

    return alerts


def deliver_post_sync_notifications(
    db: Session,
    org_id: str,
    *,
    bench: dict | None = None,
    overview: dict | None = None,
    new_outcome_ids: list[str] | None = None,
) -> dict:
    settings = get_notification_settings(db, org_id)
    results: dict = {"slack": None, "githubComments": None, "alerts": []}

    overview = overview or build_overview(db, org_id)
    bench = bench or build_benchmark_report(db, org_id)
    inbox = build_inbox_summary(db, org_id)
    profile = org_profile_payload(db, org_id)
    company = profile.get("companyName") or "Your organization"

    alerts = collect_alerts(db, org_id, settings, bench=bench)
    results["alerts"] = alerts

    last_alerts = dict(settings.get("lastAlertsJson") or {})
    send_slack = False
    filtered_alerts: list[dict] = []

    for alert in alerts:
        raw_key = f"{alert.get('type', 'alert')}:{alert.get('week') or alert.get('usedPct') or alert.get('message', '')[:60]}"
        key = hashlib.sha256(raw_key.encode()).hexdigest()[:16]
        if _should_send_alert(last_alerts, key):
            filtered_alerts.append(alert)
            last_alerts = _mark_alert_sent({"lastAlertsJson": last_alerts}, key)["lastAlertsJson"]
            send_slack = True

    if settings.get("alertOnInbox") and int(inbox.get("pendingCount") or 0) > 0:
        inbox_key = f"inbox:{inbox.get('pendingCount')}"
        if _should_send_alert(last_alerts, inbox_key, cooldown_hours=48):
            filtered_alerts.append(
                {
                    "type": "inbox",
                    "severity": "medium",
                    "message": (
                        f"{inbox['pendingCount']} attribution link"
                        f"{'s' if inbox['pendingCount'] != 1 else ''} need review"
                    ),
                }
            )
            last_alerts = _mark_alert_sent({"lastAlertsJson": last_alerts}, inbox_key)["lastAlertsJson"]
            send_slack = True

    if settings.get("slackAlertsEnabled") and settings.get("slackWebhookUrl") and send_slack:
        text = f"Outcome Ledger alerts for {company}"
        blocks = build_slack_blocks(
            company_name=company,
            overview=overview,
            alerts=filtered_alerts,
            inbox=inbox,
        )
        ok = post_slack_message(settings["slackWebhookUrl"], text=text, blocks=blocks)
        results["slack"] = {"sent": ok, "alertCount": len(filtered_alerts)}
        if ok:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                # Write last_alerts directly — avoids re-reading stale settings
                # and reduces the race window for concurrent syncs.
                current = get_notification_settings(db, org_id)
                current["lastAlertsJson"] = last_alerts
                org.notifications_json = json.dumps(current)
                db.flush()

    if settings.get("githubPrCommentsEnabled"):
        results["githubComments"] = post_pr_cost_comments(
            db, org_id, new_outcome_ids=new_outcome_ids
        )

    return results


def deliver_weekly_digest_for_org(db: Session, org_id: str) -> dict:
    settings = get_notification_settings(db, org_id)
    if not settings.get("digestEnabled"):
        return {"ok": True, "skipped": "digest disabled"}
    recipients = settings.get("digestEmails") or []
    return send_weekly_digest(db, org_id, recipients=recipients)


def deliver_weekly_digest_all_orgs(db: Session) -> dict:
    org_results = []
    for org_id in list_all_org_ids(db):
        try:
            org_results.append({"orgId": org_id, **deliver_weekly_digest_for_org(db, org_id)})
        except Exception as exc:
            logger.exception("Weekly digest failed org=%s", org_id)
            org_results.append({"orgId": org_id, "ok": False, "error": str(exc)})
    return {"ok": True, "orgs": org_results}
