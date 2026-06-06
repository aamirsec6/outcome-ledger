"""Benchmark improvements — period-over-period and workflow CPST."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.anomalies import anomalies_for_org
from app.attribution_engine import summary_from_persisted_links
from app.models import AttributionLink, CpstSnapshot, OutcomeEvent, UsageEvent
from app.network_benchmarks import network_percentiles
from app.org_profile import org_profile_payload


def _pct_change(current: float, prior: float) -> float | None:
    if prior == 0:
        return None if current == 0 else 100.0
    return round((current - prior) / prior * 100, 1)


def workflow_cpst_breakdown(db: Session, org_id: str, *, lookback_days: int = 90) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    links = (
        db.query(AttributionLink)
        .join(OutcomeEvent, OutcomeEvent.id == AttributionLink.outcome_event_id)
        .filter(
            AttributionLink.org_id == org_id,
            OutcomeEvent.occurred_at >= since,
        )
        .all()
    )
    spend_by_wf: dict[str, float] = defaultdict(float)
    outcomes_by_wf: dict[str, set[str]] = defaultdict(set)

    for link in links:
        outcome = db.query(OutcomeEvent).filter(OutcomeEvent.id == link.outcome_event_id).first()
        if not outcome:
            continue
        wf = outcome.workflow_type or "unknown"
        spend_by_wf[wf] += link.allocated_usd
        outcomes_by_wf[wf].add(outcome.id)

    rows = []
    for wf in sorted(spend_by_wf.keys()):
        oc = len(outcomes_by_wf[wf])
        spend = spend_by_wf[wf]
        rows.append(
            {
                "workflowType": wf,
                "linkedSpendUsd": round(spend, 2),
                "outcomeCount": oc,
                "cpstUsd": round(spend / oc, 4) if oc > 0 else 0.0,
            }
        )
    return rows


def build_benchmark_report(db: Session, org_id: str, *, lookback_days: int = 90) -> dict:
    """Compare current rolling window vs prior month snapshot + history trend."""
    graph = summary_from_persisted_links(db, org_id, lookback_days=lookback_days)
    workflows = workflow_cpst_breakdown(db, org_id, lookback_days=lookback_days)

    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    total_spend = float(
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .scalar()
        or 0
    )
    stable_outcomes = int(
        db.query(func.count())
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.accepted.is_(True),
            OutcomeEvent.reverted.is_(False),
            OutcomeEvent.occurred_at >= since,
        )
        .scalar()
        or 0
    )
    current_cpst = total_spend / stable_outcomes if stable_outcomes > 0 else 0.0

    snapshots = (
        db.query(CpstSnapshot)
        .filter(CpstSnapshot.org_id == org_id, CpstSnapshot.grain == "month")
        .order_by(CpstSnapshot.period_start.desc())
        .limit(6)
        .all()
    )

    prior = snapshots[1] if len(snapshots) > 1 else None
    latest_snap = snapshots[0] if snapshots else None

    improvements: dict = {}
    if prior:
        improvements = {
            "cpstPctChange": _pct_change(current_cpst, prior.cpst_usd),
            "linkedSpendPctChange": _pct_change(
                graph.get("outcomeLinkedSpendPct", 0),
                prior.linked_spend_pct,
            ),
            "avgConfidencePctChange": _pct_change(
                graph.get("avgLinkConfidence", 0) * 100,
                prior.avg_link_confidence * 100,
            ),
            "failureSharePctChange": _pct_change(
                0,
                prior.failure_cost_share,
            ),
            "priorPeriod": prior.period_start.strftime("%Y-%m"),
        }

    history = []
    for snap in reversed(snapshots):
        history.append(
            {
                "period": snap.period_start.strftime("%Y-%m"),
                "cpstUsd": snap.cpst_usd,
                "linkedSpendPct": snap.linked_spend_pct,
                "avgLinkConfidence": snap.avg_link_confidence,
                "stableOutcomes": snap.stable_outcomes,
            }
        )

    verdict = "building"
    cpst_chg = improvements.get("cpstPctChange")
    linked_chg = improvements.get("linkedSpendPctChange")
    if cpst_chg is not None and cpst_chg <= -5:
        verdict = "improving"
    elif cpst_chg is not None and cpst_chg >= 8:
        verdict = "worsening"
    elif linked_chg is not None and linked_chg >= 10:
        verdict = "attribution_improving"

    profile = org_profile_payload(db, org_id)
    vertical = (profile.get("industry") or "engineering_saas").strip() or "engineering_saas"
    anomalies = anomalies_for_org(db, org_id, lookback_days=lookback_days)
    network = network_percentiles(
        db,
        vertical=vertical,
        cpst_usd=current_cpst,
        linked_spend_pct=float(graph.get("outcomeLinkedSpendPct") or 0),
    )

    return {
        "periodLabel": f"Last {lookback_days} days",
        "current": {
            "cpstUsd": round(current_cpst, 4),
            "totalSpendUsd": round(total_spend, 2),
            "stableOutcomes": stable_outcomes,
            "linkedSpendPct": graph.get("outcomeLinkedSpendPct", 0),
            "avgLinkConfidence": graph.get("avgLinkConfidence", 0),
            "linkCount": graph.get("linkCount", 0),
            "engine": graph.get("engine", "none"),
        },
        "priorSnapshot": (
            {
                "period": prior.period_start.strftime("%Y-%m"),
                "cpstUsd": prior.cpst_usd,
                "linkedSpendPct": prior.linked_spend_pct,
                "avgLinkConfidence": prior.avg_link_confidence,
            }
            if prior
            else None
        ),
        "improvements": improvements,
        "verdict": verdict,
        "workflows": workflows,
        "history": history,
        "anomalies": anomalies,
        "network": network,
        "methodology": {
            "cpst": "total_spend / stable_outcomes",
            "linking": "proportional time-window + learned linker (persisted graph v3)",
            "workflows": "rules classifier on PR title/labels",
            "anomalies": "EWMA on weekly CPST from spend trend",
            "network": "k-anonymized vertical percentiles",
        },
    }
