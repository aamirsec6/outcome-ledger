"""Persisted attribution graph with proportional cost allocation."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.attribution import (
    WINDOW_AFTER_DAYS,
    WINDOW_BEFORE_DAYS,
    MAX_OUTCOMES,
    MAX_SAMPLE_LINKS,
    _as_utc,
    _empty_graph,
    confidence_for_link,
)
from app.models import AttributionLink, OutcomeEvent, UsageEvent
from app.workflow_classifier import label_outcome_workflows

logger = logging.getLogger(__name__)


def _outcome_window(outcome: OutcomeEvent) -> tuple[datetime, datetime]:
    start = _as_utc(outcome.occurred_at) - timedelta(days=WINDOW_BEFORE_DAYS)
    end = _as_utc(outcome.occurred_at) + timedelta(days=WINDOW_AFTER_DAYS)
    return start, end


def _candidate_outcomes(
    usage: UsageEvent,
    outcomes: list[OutcomeEvent],
    usage_by_repo: dict[str, list[UsageEvent]],
) -> list[OutcomeEvent]:
    t = _as_utc(usage.period_start)
    repo_key = (usage.repo or "").strip() or "__none__"
    hits: list[OutcomeEvent] = []
    for outcome in outcomes:
        start, end = _outcome_window(outcome)
        if not (start <= t <= end):
            continue
        o_repo = (outcome.repo or "").strip() or "__none__"
        if repo_key != "__none__" and o_repo != "__none__" and repo_key != o_repo:
            continue
        if outcome.team_id and usage.team_id and usage.team_id not in (
            None,
            "unassigned",
            outcome.team_id,
        ):
            continue
        hits.append(outcome)
    if hits:
        return hits
    # Orphan CSV: any outcome in time window
    if repo_key == "__none__":
        return [
            o
            for o in outcomes
            if _outcome_window(o)[0] <= t <= _outcome_window(o)[1]
        ]
    return []


def _weight_for_link(usage: UsageEvent, outcome: OutcomeEvent) -> float:
    """Inverse time distance — nearer merge gets more of shared spend."""
    t = _as_utc(usage.period_start).timestamp()
    m = _as_utc(outcome.occurred_at).timestamp()
    days = abs(t - m) / 86400.0
    repo_match = bool(
        usage.repo
        and outcome.repo
        and (usage.repo or "").strip() == (outcome.repo or "").strip()
    )
    base = 1.0 / (1.0 + days)
    return base * (1.5 if repo_match else 1.0)


def rebuild_attribution_graph(
    db: Session,
    org_id: str,
    *,
    lookback_days: int = 90,
    preserve_overrides: bool = True,
) -> dict:
    """
    Rebuild attribution links using proportional allocation.
    Overrides (is_manual_override=True) are kept unless preserve_overrides=False.
    """
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    label_outcome_workflows(db, org_id)

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

    override_keys: set[tuple[str, str]] = set()
    if preserve_overrides:
        for link in (
            db.query(AttributionLink)
            .filter(
                AttributionLink.org_id == org_id,
                AttributionLink.is_manual_override.is_(True),
            )
            .all()
        ):
            override_keys.add((link.usage_event_id, link.outcome_event_id))

    deleted = (
        db.query(AttributionLink)
        .filter(
            AttributionLink.org_id == org_id,
            AttributionLink.is_manual_override.is_(False),
        )
        .delete(synchronize_session=False)
    )

    usage_by_repo: dict[str, list[UsageEvent]] = defaultdict(list)
    for ev in all_usage:
        key = (ev.repo or "").strip() or "__none__"
        usage_by_repo[key].append(ev)

    created = 0
    for usage in all_usage:
        cost = float(usage.cost_usd or 0)
        if cost <= 0:
            continue
        candidates = _candidate_outcomes(usage, outcomes, usage_by_repo)
        if not candidates:
            continue

        weights = [_weight_for_link(usage, o) for o in candidates]
        total_w = sum(weights) or 1.0

        for outcome, w in zip(candidates, weights):
            if preserve_overrides and (usage.id, outcome.id) in override_keys:
                continue
            share = cost * (w / total_w)
            if share <= 0:
                continue
            team_match = bool(
                outcome.team_id
                and usage.team_id
                and usage.team_id == outcome.team_id
            )
            repo_match = bool(
                usage.repo
                and outcome.repo
                and (usage.repo or "").strip() == (outcome.repo or "").strip()
            )
            conf, method = confidence_for_link(
                team_match=team_match,
                repo_match=repo_match,
                has_team_mapping=bool(outcome.team_id),
            )
            if method == "time_window_only" and len(candidates) > 1:
                method = "proportional_window"

            existing = (
                db.query(AttributionLink)
                .filter(
                    AttributionLink.org_id == org_id,
                    AttributionLink.usage_event_id == usage.id,
                    AttributionLink.outcome_event_id == outcome.id,
                )
                .first()
            )
            if existing and existing.is_manual_override:
                continue
            if existing:
                existing.allocated_usd = round(share, 4)
                existing.confidence = conf
                existing.method = method
            else:
                db.add(
                    AttributionLink(
                        org_id=org_id,
                        usage_event_id=usage.id,
                        outcome_event_id=outcome.id,
                        allocated_usd=round(share, 4),
                        confidence=conf,
                        method=method,
                    )
                )
                created += 1

    db.flush()
    return {
        "ok": True,
        "deleted": deleted,
        "created": created,
        "outcomes": len(outcomes),
        "usageEvents": len(all_usage),
    }


def add_manual_override(
    db: Session,
    org_id: str,
    *,
    usage_event_id: str,
    outcome_event_id: str,
    reason: str,
    allocated_usd: float | None = None,
) -> dict:
    usage = (
        db.query(UsageEvent)
        .filter(UsageEvent.id == usage_event_id, UsageEvent.org_id == org_id)
        .first()
    )
    outcome = (
        db.query(OutcomeEvent)
        .filter(OutcomeEvent.id == outcome_event_id, OutcomeEvent.org_id == org_id)
        .first()
    )
    if not usage or not outcome:
        return {"ok": False, "error": "usage or outcome not found"}

    amount = allocated_usd if allocated_usd is not None else float(usage.cost_usd or 0)
    row = (
        db.query(AttributionLink)
        .filter(
            AttributionLink.org_id == org_id,
            AttributionLink.usage_event_id == usage_event_id,
            AttributionLink.outcome_event_id == outcome_event_id,
        )
        .first()
    )
    if row:
        row.allocated_usd = round(amount, 4)
        row.confidence = 1.0
        row.method = "manual_override"
        row.is_manual_override = True
        row.override_reason = reason[:256]
    else:
        db.add(
            AttributionLink(
                org_id=org_id,
                usage_event_id=usage_event_id,
                outcome_event_id=outcome_event_id,
                allocated_usd=round(amount, 4),
                confidence=1.0,
                method="manual_override",
                is_manual_override=True,
                override_reason=reason[:256],
            )
        )
    db.flush()
    return {"ok": True, "allocatedUsd": round(amount, 4)}


def summary_from_persisted_links(
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
        .count()
    )

    total_spend = sum(
        float(u.cost_usd or 0)
        for u in db.query(UsageEvent)
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .all()
    )

    links = (
        db.query(AttributionLink)
        .filter(AttributionLink.org_id == org_id)
        .all()
    )
    if not links:
        return {**_empty_graph(), "outcomeCount": outcomes, "engine": "none"}

    linked_spend = sum(l.allocated_usd for l in links)
    linked_spend = min(linked_spend, total_spend) if total_spend > 0 else linked_spend
    unlinked = max(0.0, total_spend - linked_spend)
    linked_pct = (linked_spend / total_spend * 100) if total_spend > 0 else 0.0
    avg_conf = sum(l.confidence for l in links) / len(links) if links else 0.0

    by_outcome: dict[str, float] = defaultdict(float)
    by_outcome_conf: dict[str, list[float]] = defaultdict(list)
    for link in links:
        by_outcome[link.outcome_event_id] += link.allocated_usd
        by_outcome_conf[link.outcome_event_id].append(link.confidence)

    sample: list[dict] = []
    outcome_map = {
        o.id: o
        for o in db.query(OutcomeEvent)
        .filter(OutcomeEvent.id.in_(list(by_outcome.keys())))
        .all()
    }
    for oid, spend in sorted(by_outcome.items(), key=lambda x: -x[1])[:MAX_SAMPLE_LINKS]:
        o = outcome_map.get(oid)
        if not o:
            continue
        confs = by_outcome_conf[oid]
        sample.append(
            {
                "outcomeId": oid,
                "repo": o.repo,
                "teamId": o.team_id,
                "workflowType": o.workflow_type,
                "occurredAt": _as_utc(o.occurred_at).isoformat(),
                "linkedSpendUsd": round(spend, 2),
                "confidence": round(sum(confs) / len(confs), 2),
                "method": "persisted_graph",
                "windowDays": f"-{WINDOW_BEFORE_DAYS}/+{WINDOW_AFTER_DAYS}",
            }
        )

    return {
        "outcomeCount": outcomes,
        "linkedSpendUsd": round(linked_spend, 2),
        "unlinkedSpendUsd": round(unlinked, 2),
        "outcomeLinkedSpendPct": round(linked_pct, 1),
        "avgLinkConfidence": round(avg_conf, 2),
        "windowBeforeDays": WINDOW_BEFORE_DAYS,
        "windowAfterDays": WINDOW_AFTER_DAYS,
        "sampleLinks": sample,
        "linkCount": len(links),
        "engine": "persisted_v2",
    }
