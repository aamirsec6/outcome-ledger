from __future__ import annotations

import json
from collections import defaultdict
from calendar import monthrange
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.constants import metric_version
from app.models import CpstSnapshot, OutcomeEvent, UsageEvent
from app.outcome_contracts import (
    cpst_outcome_types,
    ensure_default_contract,
    get_active_contract,
)
from app.revert_check import stable_days


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _month_end(start: datetime) -> datetime:
    last_day = monthrange(start.year, start.month)[1]
    return start.replace(
        day=last_day, hour=23, minute=59, second=59, microsecond=999999
    )


def _stable_filter(
    db: Session,
    org_id: str,
    period_start: datetime,
    period_end: datetime,
    now: datetime,
):
    stable = timedelta(days=stable_days())
    types = cpst_outcome_types(db, org_id)
    filters = [
        OutcomeEvent.org_id == org_id,
        OutcomeEvent.accepted.is_(True),
        OutcomeEvent.reverted.is_(False),
        OutcomeEvent.occurred_at >= period_start,
        OutcomeEvent.occurred_at <= period_end,
        OutcomeEvent.outcome_type.in_(types),
    ]
    if stable_days() > 0:
        filters.append(OutcomeEvent.occurred_at <= now - stable)
    return filters


def compute_period_metrics(
    db: Session,
    org_id: str,
    *,
    period_start: datetime,
    period_end: datetime,
) -> dict:
    now = datetime.now(timezone.utc)
    total_spend = float(
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= period_start,
            UsageEvent.period_start <= period_end,
        )
        .scalar()
        or 0
    )
    stable_outcomes = int(
        db.query(func.count())
        .filter(*_stable_filter(db, org_id, period_start, period_end, now))
        .scalar()
        or 0
    )
    all_merged = int(
        db.query(func.count())
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.occurred_at >= period_start,
            OutcomeEvent.occurred_at <= period_end,
        )
        .scalar()
        or 0
    )
    reverted = int(
        db.query(func.count())
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.reverted.is_(True),
            OutcomeEvent.occurred_at >= period_start,
            OutcomeEvent.occurred_at <= period_end,
        )
        .scalar()
        or 0
    )
    attributed = float(
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= period_start,
            UsageEvent.period_start <= period_end,
            UsageEvent.team_id.isnot(None),
            UsageEvent.team_id != "unassigned",
        )
        .scalar()
        or 0
    )
    cpst = total_spend / stable_outcomes if stable_outcomes > 0 else 0.0
    failure_share = (reverted / all_merged * 100) if all_merged > 0 else 0.0
    attributed_pct = (attributed / total_spend * 100) if total_spend > 0 else 0.0

    team_spend: dict[str, float] = defaultdict(float)
    for team_id, cost in (
        db.query(UsageEvent.team_id, func.sum(UsageEvent.cost_usd))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= period_start,
            UsageEvent.period_start <= period_end,
        )
        .group_by(UsageEvent.team_id)
        .all()
    ):
        team_spend[str(team_id or "unassigned")] += float(cost or 0)

    team_outcomes: dict[str, int] = defaultdict(int)
    for team_id, cnt in (
        db.query(OutcomeEvent.team_id, func.count())
        .filter(*_stable_filter(db, org_id, period_start, period_end, now))
        .group_by(OutcomeEvent.team_id)
        .all()
    ):
        team_outcomes[str(team_id or "unassigned")] += int(cnt or 0)

    team_rows = []
    for tid in sorted(set(team_spend) | set(team_outcomes)):
        s = team_spend.get(tid, 0.0)
        oc = team_outcomes.get(tid, 0)
        team_rows.append(
            {
                "teamId": tid,
                "spendUsd": round(s, 2),
                "stableOutcomes": oc,
                "cpstUsd": round(s / oc, 2) if oc > 0 else 0.0,
            }
        )

    return {
        "totalSpendUsd": round(total_spend, 2),
        "stableOutcomes": stable_outcomes,
        "cpstUsd": round(cpst, 2),
        "failureCostShare": round(failure_share, 1),
        "attributedPct": round(attributed_pct, 1),
        "teams": team_rows,
    }


def upsert_month_snapshot(db: Session, org_id: str, month: datetime) -> CpstSnapshot:
    period_start = _month_start(month)
    period_end = _month_end(period_start)
    metrics = compute_period_metrics(
        db, org_id, period_start=period_start, period_end=period_end
    )
    contract = get_active_contract(db, org_id)
    existing = (
        db.query(CpstSnapshot)
        .filter(
            CpstSnapshot.org_id == org_id,
            CpstSnapshot.period_start == period_start,
            CpstSnapshot.grain == "month",
        )
        .first()
    )
    if existing:
        row = existing
    else:
        row = CpstSnapshot(
            org_id=org_id,
            period_start=period_start,
            period_end=period_end,
            grain="month",
        )
        db.add(row)

    row.contract_id = contract.id if contract else None
    row.contract_version = contract.version if contract else None
    row.metric_version = metric_version()
    row.total_spend_usd = metrics["totalSpendUsd"]
    row.stable_outcomes = metrics["stableOutcomes"]
    row.cpst_usd = metrics["cpstUsd"]
    row.failure_cost_share = metrics["failureCostShare"]
    row.attributed_pct = metrics["attributedPct"]
    row.teams_json = json.dumps(metrics["teams"])
    row.recorded_at = datetime.now(timezone.utc)
    db.flush()
    return row


def record_cpst_snapshots(db: Session, org_id: str, *, months_back: int = 12) -> dict:
    """Refresh monthly snapshots (current month + backfill). Called after sync."""
    ensure_default_contract(db, org_id)
    now = datetime.now(timezone.utc)
    recorded = []
    for i in range(months_back):
        m = _month_start(now)
        if i > 0:
            month = m.month - i
            year = m.year
            while month <= 0:
                month += 12
                year -= 1
            m = m.replace(year=year, month=month)
        row = upsert_month_snapshot(db, org_id, m)
        recorded.append(
            {
                "period": row.period_start.strftime("%Y-%m"),
                "cpstUsd": row.cpst_usd,
                "stableOutcomes": row.stable_outcomes,
            }
        )
    return {"ok": True, "recorded": recorded}


def list_cpst_history(db: Session, org_id: str, *, limit: int = 24) -> list[dict]:
    rows = (
        db.query(CpstSnapshot)
        .filter(CpstSnapshot.org_id == org_id, CpstSnapshot.grain == "month")
        .order_by(CpstSnapshot.period_start.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in reversed(rows):
        teams = []
        if r.teams_json:
            try:
                teams = json.loads(r.teams_json)
            except json.JSONDecodeError:
                teams = []
        out.append(
            {
                "period": r.period_start.strftime("%Y-%m"),
                "periodStart": r.period_start.isoformat(),
                "periodEnd": r.period_end.isoformat(),
                "contractVersion": r.contract_version,
                "metricVersion": r.metric_version,
                "totalSpendUsd": r.total_spend_usd,
                "stableOutcomes": r.stable_outcomes,
                "cpstUsd": r.cpst_usd,
                "failureCostShare": r.failure_cost_share,
                "attributedPct": r.attributed_pct,
                "recordedAt": r.recorded_at.isoformat() if r.recorded_at else None,
                "cfoApprovedContract": bool(r.contract_version),
                "teams": teams,
            }
        )
    return out


def snapshot_to_dict(row: CpstSnapshot) -> dict:
    teams = []
    if row.teams_json:
        try:
            teams = json.loads(row.teams_json)
        except json.JSONDecodeError:
            teams = []
    return {
        "id": row.id,
        "period": row.period_start.strftime("%Y-%m"),
        "grain": row.grain,
        "contractVersion": row.contract_version,
        "metricVersion": row.metric_version,
        "totalSpendUsd": row.total_spend_usd,
        "stableOutcomes": row.stable_outcomes,
        "cpstUsd": row.cpst_usd,
        "failureCostShare": row.failure_cost_share,
        "attributedPct": row.attributed_pct,
        "recordedAt": row.recorded_at.isoformat() if row.recorded_at else None,
        "teams": teams,
    }
