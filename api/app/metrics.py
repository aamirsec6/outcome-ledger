from __future__ import annotations

import logging
import os
from collections import defaultdict

logger = logging.getLogger(__name__)
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.constants import metric_version
from app.models import Organization, OutcomeEvent, ProviderConnection, UsageEvent
from app.request_context import get_request_org_id
from app.outcome_contracts import (
    active_contract_payload,
    cpst_outcome_types,
    ensure_default_contract,
    primary_win_type,
)
from app.revert_check import stable_days
from app.sync_audit import last_sync_run



def ensure_default_org(db: Session) -> str:
    """Resolve org for this request (tenant key context or legacy default org)."""
    bound = get_request_org_id()
    if bound:
        return bound
    org = (
        db.query(Organization)
        .order_by(Organization.created_at.asc())
        .first()
    )
    if org:
        return org.id
    org = Organization(name="Default org")
    db.add(org)
    db.flush()
    return org.id


def _stable_outcome_filter(
    since: datetime,
    now: datetime,
    *,
    org_id: str,
    db: Session,
):
    """Outcomes that count toward CPST for the active win definition."""
    stable = timedelta(days=stable_days())
    types = cpst_outcome_types(db, org_id)
    q_filter = [
        OutcomeEvent.org_id == org_id,
        OutcomeEvent.accepted.is_(True),
        OutcomeEvent.reverted.is_(False),
        OutcomeEvent.occurred_at >= since,
        OutcomeEvent.outcome_type.in_(types),
    ]
    if stable_days() > 0:
        q_filter.append(OutcomeEvent.occurred_at <= now - stable)
    return q_filter


def build_overview(db: Session, org_id: str, *, lookback_days: int = 90) -> dict:
    ensure_default_contract(db, org_id)
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    now = datetime.now(timezone.utc)
    stable = timedelta(days=stable_days())

    total_spend = (
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .scalar()
    )
    total_spend = float(total_spend or 0)

    stable_outcomes = (
        db.query(func.count())
        .filter(*_stable_outcome_filter(since, now, org_id=org_id, db=db))
        .scalar()
    )
    stable_outcomes = int(stable_outcomes or 0)

    pending_outcomes = 0
    if stable_days() > 0:
        types = cpst_outcome_types(db, org_id)
        pending_outcomes = (
            db.query(func.count())
            .filter(
                OutcomeEvent.org_id == org_id,
                OutcomeEvent.accepted.is_(True),
                OutcomeEvent.reverted.is_(False),
                OutcomeEvent.occurred_at >= since,
                OutcomeEvent.occurred_at > now - stable,
                OutcomeEvent.outcome_type.in_(types),
            )
            .scalar()
        )
        pending_outcomes = int(pending_outcomes or 0)

    reverted_outcomes = (
        db.query(func.count())
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.reverted.is_(True),
            OutcomeEvent.occurred_at >= since,
        )
        .scalar()
    )
    reverted_outcomes = int(reverted_outcomes or 0)

    org_cpst = total_spend / stable_outcomes if stable_outcomes > 0 else 0.0

    attributed = (
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= since,
            UsageEvent.team_id.isnot(None),
            UsageEvent.team_id != "unassigned",
        )
        .scalar()
    )
    attributed = float(attributed or 0)
    attributed_pct = (attributed / total_spend * 100) if total_spend > 0 else 0.0

    all_merged = (
        db.query(func.count())
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.occurred_at >= since,
        )
        .scalar()
    )
    all_merged = int(all_merged or 0)
    failure_share = 0.0
    if all_merged > 0:
        failure_share = (reverted_outcomes / all_merged) * 100

    team_spend: dict[str, float] = defaultdict(float)
    for team_id, cost in (
        db.query(UsageEvent.team_id, func.sum(UsageEvent.cost_usd))
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .group_by(UsageEvent.team_id)
        .all()
    ):
        team_spend[str(team_id or "unassigned")] += float(cost or 0)

    team_outcomes: dict[str, int] = defaultdict(int)
    for team_id, cnt in (
        db.query(OutcomeEvent.team_id, func.count())
        .filter(*_stable_outcome_filter(since, now, org_id=org_id, db=db))
        .group_by(OutcomeEvent.team_id)
        .all()
    ):
        team_outcomes[str(team_id or "unassigned")] += int(cnt or 0)

    teams = []
    all_team_ids = set(team_spend) | set(team_outcomes)
    for tid in sorted(all_team_ids):
        spend = team_spend.get(tid, 0.0)
        oc = team_outcomes.get(tid, 0)
        cpst = spend / oc if oc > 0 else 0.0
        attr_pct = 100.0 if tid != "unassigned" else 40.0
        teams.append(
            {
                "teamId": tid,
                "teamName": tid.replace("-", " ").title(),
                "spendUsd": round(spend, 2),
                "acceptedOutcomes": oc,
                "cpstUsd": round(cpst, 2),
                "failureCostShare": round(failure_share, 0),
                "attributedPct": round(attr_pct, 0),
            }
        )

    usage_sources = {
        r[0]
        for r in db.query(UsageEvent.source)
        .filter(UsageEvent.org_id == org_id)
        .distinct()
        .all()
    }
    from app.github_status import github_is_connected

    has_github = (
        github_is_connected(db, org_id)
        or db.query(OutcomeEvent).filter(OutcomeEvent.org_id == org_id).first()
        is not None
    )
    integrations = []
    for src, label in [
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
        ("github", "GitHub"),
        ("cursor", "Cursor"),
        ("claude-code", "Claude Code"),
    ]:
        if src == "github":
            connected = has_github
        elif src in ("openai", "anthropic"):
            connected = _vendor_configured(src, db, org_id)
        else:
            connected = src in usage_sources
        integrations.append(
            {
                "id": src,
                "name": label,
                "status": "connected" if connected else "pending",
            }
        )

    # Rolling 7-day windows ending at now (W1 = oldest … W5 = most recent)
    spend_trend = []
    for i in range(5):
        w_end = now - timedelta(days=(4 - i) * 7)
        w_start = w_end - timedelta(days=7)
        w_spend = (
            db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
            .filter(
                UsageEvent.org_id == org_id,
                UsageEvent.period_start >= w_start,
                UsageEvent.period_start < w_end,
            )
            .scalar()
        )
        w_out = (
            db.query(func.count())
            .filter(
                *_stable_outcome_filter(w_start, w_end, org_id=org_id, db=db),
                OutcomeEvent.occurred_at < w_end,
            )
            .scalar()
        )
        spend_trend.append(
            {
                "week": f"W{i + 1}",
                "spend": float(w_spend or 0),
                "outcomes": int(w_out or 0),
            }
        )

    last = last_sync_run(db, org_id)
    last_sync = None
    if last:
        last_sync = {
            "trigger": last.trigger,
            "ok": last.ok,
            "startedAt": last.started_at.isoformat() if last.started_at else None,
        }

    contract = active_contract_payload(db, org_id)

    return {
        "periodLabel": f"Last {lookback_days} days (live)",
        "metricVersion": metric_version(),
        "stableDays": stable_days(),
        "winType": primary_win_type(db, org_id),
        "activeContract": contract,
        "totalSpendUsd": round(total_spend, 2),
        "totalOutcomes": stable_outcomes,
        "stableOutcomes": stable_outcomes,
        "pendingOutcomes": pending_outcomes,
        "revertedOutcomes": reverted_outcomes,
        "orgCpstUsd": round(org_cpst, 2),
        "attributedSpendPct": round(attributed_pct, 0),
        "failureCostShare": round(failure_share, 0),
        "spendTrend": spend_trend,
        "teams": teams,
        "integrations": integrations,
        "lastSync": last_sync,
        "dataSource": "live",
    }


def build_attribution_breakdown(
    db: Session, org_id: str, *, lookback_days: int = 90
) -> dict:
    from app.attribution import build_outcome_linked_summary
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    total_spend = (
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .scalar()
    )
    total_spend = float(total_spend or 0)

    attributed = (
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= since,
            UsageEvent.team_id.isnot(None),
            UsageEvent.team_id != "unassigned",
        )
        .scalar()
    )
    attributed = float(attributed or 0)
    unassigned = max(0.0, total_spend - attributed)
    attributed_pct = (attributed / total_spend * 100) if total_spend > 0 else 0.0
    unassigned_pct = (unassigned / total_spend * 100) if total_spend > 0 else 0.0

    by_source: dict[str, float] = defaultdict(float)
    for source, cost in (
        db.query(UsageEvent.source, func.sum(UsageEvent.cost_usd))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= since,
            (UsageEvent.team_id.is_(None)) | (UsageEvent.team_id == "unassigned"),
        )
        .group_by(UsageEvent.source)
        .all()
    ):
        by_source[str(source or "unknown")] += float(cost or 0)

    by_team: dict[str, float] = defaultdict(float)
    for team_id, cost in (
        db.query(UsageEvent.team_id, func.sum(UsageEvent.cost_usd))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= since,
            UsageEvent.team_id.isnot(None),
            UsageEvent.team_id != "unassigned",
        )
        .group_by(UsageEvent.team_id)
        .all()
    ):
        by_team[str(team_id)] += float(cost or 0)

    try:
        outcome_graph = build_outcome_linked_summary(
            db, org_id, lookback_days=lookback_days
        )
    except Exception:
        logger.exception("attribution outcome_graph failed")
        from app.attribution import _empty_graph

        outcome_graph = _empty_graph()

    return {
        "periodLabel": f"Last {lookback_days} days",
        "totalSpendUsd": round(total_spend, 2),
        "attributedSpendUsd": round(attributed, 2),
        "unassignedSpendUsd": round(unassigned, 2),
        "attributedSpendPct": round(attributed_pct, 1),
        "unassignedSpendPct": round(unassigned_pct, 1),
        "targetPct": 80,
        "meetsTarget": attributed_pct >= 80,
        "outcomeGraph": outcome_graph,
        "unassignedBySource": [
            {"source": k, "spendUsd": round(v, 2)}
            for k, v in sorted(by_source.items(), key=lambda x: -x[1])
        ],
        "attributedByTeam": [
            {"teamId": k, "spendUsd": round(v, 2)}
            for k, v in sorted(by_team.items(), key=lambda x: -x[1])
        ],
    }


def _vendor_configured(vendor: str, db: Session | None = None, org_id: str | None = None) -> bool:
    if db is not None and org_id:
        from app.org_credentials import vendor_configured_for_org

        return vendor_configured_for_org(db, org_id, vendor)
    if vendor == "openai":
        return bool((os.getenv("OPENAI_API_KEY") or "").strip())
    if vendor == "anthropic":
        return bool((os.getenv("ANTHROPIC_ADMIN_API_KEY") or "").strip())
    return False
