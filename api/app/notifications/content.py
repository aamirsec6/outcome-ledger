"""Build alert and digest content from metrics."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.metrics import build_overview
from app.models import UsageEvent
from app.notifications.inbox import build_inbox_summary
from app.org_profile import org_profile_payload


def month_to_date_spend_usd(db: Session, org_id: str) -> float:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    total = (
        db.query(func.coalesce(func.sum(UsageEvent.cost_usd), 0.0))
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= month_start,
        )
        .scalar()
    )
    return float(total or 0)


def build_budget_alert(
    *,
    mtd_spend_usd: float,
    monthly_budget_usd: float,
    threshold_pct: float,
) -> dict | None:
    if monthly_budget_usd <= 0:
        return None
    used_pct = mtd_spend_usd / monthly_budget_usd * 100
    if used_pct < threshold_pct:
        return None
    return {
        "type": "budget_burn",
        "mtdSpendUsd": round(mtd_spend_usd, 2),
        "monthlyBudgetUsd": round(monthly_budget_usd, 2),
        "usedPct": round(used_pct, 1),
        "thresholdPct": threshold_pct,
        "severity": "high" if used_pct >= 95 else "medium",
        "message": (
            f"AI spend at {round(used_pct)}% of monthly budget "
            f"(${mtd_spend_usd:,.0f} / ${monthly_budget_usd:,.0f})"
        ),
    }


def build_digest_context(db: Session, org_id: str, *, lookback_days: int = 90) -> dict:
    from app.benchmarks import build_benchmark_report

    profile = org_profile_payload(db, org_id)
    overview = build_overview(db, org_id, lookback_days=lookback_days)
    bench = build_benchmark_report(db, org_id, lookback_days=lookback_days)
    inbox = build_inbox_summary(db, org_id)
    mtd = month_to_date_spend_usd(db, org_id)

    anomalies = [
        a for a in (bench.get("anomalies") or [])
        if a.get("severity") in ("high", "medium")
    ][:3]

    teams = sorted(
        overview.get("teams") or [],
        key=lambda t: float(t.get("cpstUsd") or 0),
        reverse=True,
    )[:3]

    return {
        "companyName": profile.get("companyName") or "Your organization",
        "periodLabel": overview.get("periodLabel") or "",
        "totalSpendUsd": float(overview.get("totalSpendUsd") or 0),
        "stableOutcomes": int(overview.get("stableOutcomes") or 0),
        "orgCpstUsd": float(overview.get("orgCpstUsd") or 0),
        "attributedSpendPct": float(overview.get("attributedSpendPct") or 0),
        "mtdSpendUsd": mtd,
        "verdict": bench.get("verdict"),
        "anomalies": anomalies,
        "teams": teams,
        "inbox": inbox,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }
