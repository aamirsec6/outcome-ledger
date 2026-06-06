"""Anonymized network benchmark percentiles (Phase 2)."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import BenchmarkContribution

K_ANON_MIN = 3
DEFAULT_VERTICAL = "engineering_saas"


def _anon_org_token(org_id: str) -> str:
    return hashlib.sha256(f"bench|{org_id}".encode()).hexdigest()[:16]


def publish_org_benchmark(
    db: Session,
    org_id: str,
    *,
    period: str,
    vertical: str,
    cpst_usd: float,
    linked_spend_pct: float,
    stable_outcomes: int,
    headcount_band: str = "unknown",
) -> dict:
    token = _anon_org_token(org_id)
    row = (
        db.query(BenchmarkContribution)
        .filter(
            BenchmarkContribution.period == period,
            BenchmarkContribution.anon_org_token == token,
        )
        .first()
    )
    if not row:
        row = BenchmarkContribution(
            period=period,
            anon_org_token=token,
            vertical=vertical or DEFAULT_VERTICAL,
        )
        db.add(row)
    row.vertical = vertical or DEFAULT_VERTICAL
    row.headcount_band = headcount_band
    row.cpst_usd = float(cpst_usd)
    row.linked_spend_pct = float(linked_spend_pct)
    row.stable_outcomes = int(stable_outcomes)
    row.updated_at = datetime.now(timezone.utc)
    db.flush()
    return {"ok": True, "period": period}


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


def network_percentiles(
    db: Session,
    *,
    vertical: str,
    cpst_usd: float,
    linked_spend_pct: float,
) -> dict:
    rows = (
        db.query(BenchmarkContribution)
        .filter(BenchmarkContribution.vertical == (vertical or DEFAULT_VERTICAL))
        .all()
    )
    n = len(rows)
    if n < K_ANON_MIN:
        return {
            "available": False,
            "reason": f"Need >={K_ANON_MIN} anonymized orgs (have {n})",
            "vertical": vertical or DEFAULT_VERTICAL,
        }

    cpsts = [r.cpst_usd for r in rows if r.cpst_usd > 0]
    linked = [r.linked_spend_pct for r in rows]

    def rank_pct(value: float, series: list[float], lower_is_better: bool) -> float:
        if not series:
            return 50.0
        if lower_is_better:
            below = sum(1 for v in series if v > value)
        else:
            below = sum(1 for v in series if v < value)
        return round(below / len(series) * 100, 1)

    return {
        "available": True,
        "vertical": vertical or DEFAULT_VERTICAL,
        "cohortSize": n,
        "cpst": {
            "yourUsd": round(cpst_usd, 4),
            "p25": round(_percentile(cpsts, 25), 4),
            "p50": round(_percentile(cpsts, 50), 4),
            "p75": round(_percentile(cpsts, 75), 4),
            "yourPercentile": rank_pct(cpst_usd, cpsts, lower_is_better=True),
        },
        "linkedSpend": {
            "yourPct": round(linked_spend_pct, 1),
            "p50": round(_percentile(linked, 50), 1),
            "yourPercentile": rank_pct(linked_spend_pct, linked, lower_is_better=False),
        },
    }
