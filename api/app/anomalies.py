"""EWMA anomaly detection on weekly CPST (Phase 2)."""

from __future__ import annotations

from app.metrics import build_overview


def _ewma(values: list[float], alpha: float = 0.35) -> list[float]:
    if not values:
        return []
    out = [values[0]]
    for v in values[1:]:
        out.append(alpha * v + (1 - alpha) * out[-1])
    return out


def detect_cpst_anomalies(
    spend_trend: list[dict],
    *,
    spike_threshold_pct: float = 25.0,
) -> list[dict]:
    """
    Flag weeks where CPST deviates sharply from EWMA baseline.
    spend_trend items: { week, spend, outcomes }
    """
    points = []
    for d in spend_trend:
        oc = int(d.get("outcomes") or 0)
        sp = float(d.get("spend") or 0)
        cpst = sp / oc if oc > 0 else 0.0
        points.append({"week": d.get("week", "?"), "cpst": cpst, "outcomes": oc})

    if len(points) < 2:
        return []

    cpst_series = [p["cpst"] for p in points]
    baseline = _ewma(cpst_series)
    alerts: list[dict] = []

    for i, (p, base) in enumerate(zip(points, baseline)):
        if base <= 0 or p["cpst"] <= 0:
            continue
        ch = (p["cpst"] - base) / base * 100
        if ch >= spike_threshold_pct:
            alerts.append(
                {
                    "week": p["week"],
                    "cpstUsd": round(p["cpst"], 4),
                    "baselineUsd": round(base, 4),
                    "changePct": round(ch, 1),
                    "severity": "high" if ch >= 40 else "medium",
                    "message": f"CPST up {round(ch)}% vs EWMA baseline in {p['week']}",
                }
            )
        elif ch <= -spike_threshold_pct:
            alerts.append(
                {
                    "week": p["week"],
                    "cpstUsd": round(p["cpst"], 4),
                    "baselineUsd": round(base, 4),
                    "changePct": round(ch, 1),
                    "severity": "good",
                    "message": f"CPST down {abs(round(ch))}% vs baseline in {p['week']}",
                }
            )
    return alerts


def anomalies_for_org(db, org_id: str, *, lookback_days: int = 90) -> list[dict]:
    overview = build_overview(db, org_id, lookback_days=lookback_days)
    return detect_cpst_anomalies(overview.get("spendTrend") or [])
