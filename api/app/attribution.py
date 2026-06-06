"""Outcome-linked spend (attribution graph Phase 1)."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import OutcomeEvent, UsageEvent

logger = logging.getLogger(__name__)

WINDOW_BEFORE_DAYS = 14
WINDOW_AFTER_DAYS = 2
MAX_OUTCOMES = 200
MAX_SAMPLE_LINKS = 25


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _empty_graph() -> dict:
    return {
        "outcomeCount": 0,
        "linkedSpendUsd": 0.0,
        "unlinkedSpendUsd": 0.0,
        "outcomeLinkedSpendPct": 0.0,
        "avgLinkConfidence": 0.0,
        "windowBeforeDays": WINDOW_BEFORE_DAYS,
        "windowAfterDays": WINDOW_AFTER_DAYS,
        "sampleLinks": [],
    }


def confidence_for_link(
    *,
    team_match: bool,
    repo_match: bool,
    has_team_mapping: bool,
) -> tuple[float, str]:
    if team_match and repo_match:
        return 0.92, "repo_team_window"
    if repo_match and has_team_mapping:
        return 0.78, "repo_window"
    if repo_match:
        return 0.65, "repo_window_unmapped_team"
    return 0.4, "time_window_only"


def build_outcome_linked_summary(
    db: Session, org_id: str, *, lookback_days: int = 90
) -> dict:
    try:
        from app.attribution_engine import summary_from_persisted_links
        from app.models import AttributionLink

        has_links = (
            db.query(AttributionLink)
            .filter(AttributionLink.org_id == org_id)
            .limit(1)
            .first()
        )
        if has_links:
            return summary_from_persisted_links(
                db, org_id, lookback_days=lookback_days
            )
        return _build_outcome_linked_summary(db, org_id, lookback_days=lookback_days)
    except Exception:
        logger.exception("outcome_linked_summary failed org_id=%s", org_id)
        return _empty_graph()


def _build_outcome_linked_summary(
    db: Session, org_id: str, *, lookback_days: int = 90
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    outcomes = (
        db.query(OutcomeEvent)
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.accepted.is_(True),
            OutcomeEvent.reverted.is_(False),
            OutcomeEvent.occurred_at >= since,
        )
        .order_by(OutcomeEvent.occurred_at.desc())
        .limit(MAX_OUTCOMES)
        .all()
    )

    all_usage = (
        db.query(UsageEvent)
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .all()
    )

    if not all_usage:
        return {**_empty_graph(), "outcomeCount": len(outcomes)}

    usage_by_repo: dict[str, list[UsageEvent]] = defaultdict(list)
    for ev in all_usage:
        key = (ev.repo or "").strip() or "__none__"
        usage_by_repo[key].append(ev)

    orphan_usage = list(usage_by_repo.get("__none__", []))
    total_spend = sum(float(u.cost_usd or 0) for u in all_usage)
    linked_event_ids: set[str] = set()
    links: list[dict] = []

    for outcome in outcomes:
        start = _as_utc(outcome.occurred_at) - timedelta(days=WINDOW_BEFORE_DAYS)
        end = _as_utc(outcome.occurred_at) + timedelta(days=WINDOW_AFTER_DAYS)
        repo_key = (outcome.repo or "").strip() or "__none__"
        pool = list(usage_by_repo.get(repo_key, []))
        # CSV / vendor rows without repo still count in the outcome time window
        if repo_key != "__none__" and orphan_usage:
            seen = {e.id for e in pool}
            pool.extend(e for e in orphan_usage if e.id not in seen)
        if outcome.team_id:
            pool = [e for e in pool if e.team_id in (None, outcome.team_id)]
        if not pool and repo_key != "__none__":
            pool = list(usage_by_repo.get(repo_key, []))

        matched: list[UsageEvent] = []
        for ev in pool:
            t = _as_utc(ev.period_start)
            if start <= t <= end:
                matched.append(ev)

        spend = sum(float(ev.cost_usd or 0) for ev in matched)
        if spend <= 0:
            continue

        for ev in matched:
            linked_event_ids.add(ev.id)

        team_match = bool(
            outcome.team_id and any(e.team_id == outcome.team_id for e in matched)
        )
        conf, method = confidence_for_link(
            team_match=team_match,
            repo_match=bool(outcome.repo),
            has_team_mapping=bool(outcome.team_id),
        )
        if len(links) < MAX_SAMPLE_LINKS:
            links.append(
                {
                    "outcomeId": outcome.id,
                    "repo": outcome.repo,
                    "teamId": outcome.team_id,
                    "occurredAt": _as_utc(outcome.occurred_at).isoformat(),
                    "linkedSpendUsd": round(spend, 2),
                    "confidence": round(conf, 2),
                    "method": method,
                    "windowDays": f"-{WINDOW_BEFORE_DAYS}/+{WINDOW_AFTER_DAYS}",
                }
            )

    linked_spend = sum(
        float(u.cost_usd or 0) for u in all_usage if u.id in linked_event_ids
    )
    unlinked_spend = max(0.0, total_spend - linked_spend)
    linked_pct = (linked_spend / total_spend * 100) if total_spend > 0 else 0.0
    avg_conf = sum(l["confidence"] for l in links) / len(links) if links else 0.0

    return {
        "outcomeCount": len(outcomes),
        "linkedSpendUsd": round(linked_spend, 2),
        "unlinkedSpendUsd": round(unlinked_spend, 2),
        "outcomeLinkedSpendPct": round(linked_pct, 1),
        "avgLinkConfidence": round(avg_conf, 2),
        "windowBeforeDays": WINDOW_BEFORE_DAYS,
        "windowAfterDays": WINDOW_AFTER_DAYS,
        "sampleLinks": links,
    }
