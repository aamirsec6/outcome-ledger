"""Feature extraction for learned attribution linker."""

from __future__ import annotations

import math
from datetime import timedelta

from app.attribution import WINDOW_AFTER_DAYS, WINDOW_BEFORE_DAYS, _as_utc
from app.models import OutcomeEvent, UsageEvent

FEATURE_NAMES = [
    "days_to_merge",
    "in_window",
    "repo_match",
    "pr_match",
    "team_match",
    "has_trace",
    "cost_log",
]


def extract_link_features(usage: UsageEvent, outcome: OutcomeEvent) -> dict[str, float]:
    t_usage = _as_utc(usage.period_start)
    t_outcome = _as_utc(outcome.occurred_at)
    days = abs((t_usage - t_outcome).total_seconds()) / 86400.0
    start = t_outcome - timedelta(days=WINDOW_BEFORE_DAYS)
    end = t_outcome + timedelta(days=WINDOW_AFTER_DAYS)
    in_window = float(start <= t_usage <= end)

    u_repo = (usage.repo or "").strip()
    o_repo = (outcome.repo or "").strip()
    repo_match = float(bool(u_repo and o_repo and u_repo == o_repo))
    pr_match = float(
        usage.pr_number is not None
        and outcome.pr_number is not None
        and usage.pr_number == outcome.pr_number
    )
    team_match = float(
        bool(
            usage.team_id
            and outcome.team_id
            and usage.team_id not in ("unassigned",)
            and usage.team_id == outcome.team_id
        )
    )
    has_trace = float(bool(usage.trace_id))
    cost_log = float(math.log1p(max(0.0, float(usage.cost_usd or 0))))
    return {
        "days_to_merge": days,
        "in_window": in_window,
        "repo_match": repo_match,
        "pr_match": pr_match,
        "team_match": team_match,
        "has_trace": has_trace,
        "cost_log": cost_log,
    }


def feature_vector(features: dict[str, float]) -> list[float]:
    return [features[n] for n in FEATURE_NAMES]
