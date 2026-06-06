"""Per-org notification preferences (Slack, digest email, budget alerts)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import Organization

DEFAULT_SETTINGS: dict[str, Any] = {
    "slackWebhookUrl": "",
    "slackAlertsEnabled": False,
    "digestEmails": [],
    "digestEnabled": False,
    "monthlyBudgetUsd": 0.0,
    "budgetAlertThresholdPct": 80.0,
    "githubPrCommentsEnabled": False,
    "alertOnCpstSpike": True,
    "alertOnBudgetBurn": True,
    "alertOnInbox": True,
    "lastAlertsJson": {},
}


def _parse_json(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def get_notification_settings(db: Session, org_id: str) -> dict[str, Any]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    stored = _parse_json(org.notifications_json if org else None)
    out = {**DEFAULT_SETTINGS, **stored}
    emails = out.get("digestEmails")
    if isinstance(emails, str):
        out["digestEmails"] = [e.strip() for e in emails.split(",") if e.strip()]
    elif not isinstance(emails, list):
        out["digestEmails"] = []
    else:
        out["digestEmails"] = [str(e).strip() for e in emails if str(e).strip()]
    out["monthlyBudgetUsd"] = float(out.get("monthlyBudgetUsd") or 0)
    out["budgetAlertThresholdPct"] = float(out.get("budgetAlertThresholdPct") or 80)
    return out


def update_notification_settings(db: Session, org_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise ValueError("Organization not found")
    current = get_notification_settings(db, org_id)

    if "slackWebhookUrl" in payload:
        current["slackWebhookUrl"] = str(payload.get("slackWebhookUrl") or "").strip()
    if "slackAlertsEnabled" in payload:
        current["slackAlertsEnabled"] = bool(payload.get("slackAlertsEnabled"))
    if "digestEnabled" in payload:
        current["digestEnabled"] = bool(payload.get("digestEnabled"))
    if "digestEmails" in payload:
        raw = payload.get("digestEmails")
        if isinstance(raw, str):
            current["digestEmails"] = [e.strip() for e in raw.split(",") if e.strip()]
        elif isinstance(raw, list):
            current["digestEmails"] = [str(e).strip() for e in raw if str(e).strip()]
    if "monthlyBudgetUsd" in payload:
        try:
            current["monthlyBudgetUsd"] = max(0.0, float(payload.get("monthlyBudgetUsd") or 0))
        except (TypeError, ValueError):
            current["monthlyBudgetUsd"] = 0.0
    if "budgetAlertThresholdPct" in payload:
        try:
            current["budgetAlertThresholdPct"] = max(
                1.0, min(100.0, float(payload.get("budgetAlertThresholdPct") or 80))
            )
        except (TypeError, ValueError):
            current["budgetAlertThresholdPct"] = 80.0
    if "githubPrCommentsEnabled" in payload:
        current["githubPrCommentsEnabled"] = bool(payload.get("githubPrCommentsEnabled"))
    for key in ("alertOnCpstSpike", "alertOnBudgetBurn", "alertOnInbox"):
        if key in payload:
            current[key] = bool(payload.get(key))

    org.notifications_json = json.dumps(current)
    db.flush()
    return get_notification_settings(db, org_id)


def settings_payload_for_api(settings: dict[str, Any]) -> dict[str, Any]:
    """Public API shape — mask webhook partially."""
    webhook = settings.get("slackWebhookUrl") or ""
    masked = ""
    if webhook:
        masked = webhook[:28] + "…" if len(webhook) > 32 else webhook
    return {
        **settings,
        "slackWebhookConfigured": bool(webhook),
        "slackWebhookMasked": masked,
        "slackWebhookUrl": webhook,
    }
