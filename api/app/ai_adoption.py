"""AI adoption, shipped output, and AI-assisted win proxies (Weave-adjacent metrics)."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.metrics import _stable_outcome_filter
from app.models import OutcomeEvent, UsageEvent
from app.pr_code_attribution import code_attribution_summary
from app.revert_check import stable_days

SOURCE_LABELS = {
    "cursor": "Cursor",
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "claude-code": "Claude Code",
    "copilot": "Copilot",
    "langfuse": "Langfuse",
    "csv": "CSV import",
}


def _outcome_author(row: OutcomeEvent) -> str | None:
    if not row.raw_json:
        return None
    try:
        meta = json.loads(row.raw_json)
    except json.JSONDecodeError:
        return None
    author = meta.get("author")
    return str(author).strip() if author else None


def _ai_user_keys(user_ids: list[str | None]) -> set[str]:
    keys: set[str] = set()
    for raw in user_ids:
        if not raw:
            continue
        u = raw.strip().lower()
        keys.add(u)
        if "@" in u:
            keys.add(u.split("@", 1)[0])
        keys.add(u.replace(".", "").replace("_", ""))
    return keys


def _author_ai_assisted(author: str | None, ai_keys: set[str]) -> bool:
    if not author or not ai_keys:
        return False
    a = author.strip().lower()
    compact = a.replace("-", "").replace("_", "")
    for key in ai_keys:
        if not key:
            continue
        if key == a or key in a or a in key:
            return True
        if compact and (key in compact or compact in key):
            return True
    return False


def build_ai_adoption_report(db: Session, org_id: str, *, lookback_days: int = 90) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    now = datetime.now(timezone.utc)

    usage_rows = (
        db.query(UsageEvent)
        .filter(UsageEvent.org_id == org_id, UsageEvent.period_start >= since)
        .all()
    )
    outcomes = (
        db.query(OutcomeEvent)
        .filter(*_stable_outcome_filter(since, now, org_id=org_id, db=db))
        .all()
    )

    total_spend = sum(float(u.cost_usd or 0) for u in usage_rows)
    ai_keys = _ai_user_keys([u.user_id for u in usage_rows])

    ai_assisted = 0
    human_only = 0
    unknown_author = 0
    for outcome in outcomes:
        author = _outcome_author(outcome)
        if not author:
            unknown_author += 1
            if usage_rows:
                ai_assisted += 1
            continue
        if _author_ai_assisted(author, ai_keys) or (
            outcome.team_id
            and any(
                u.team_id == outcome.team_id and float(u.cost_usd or 0) > 0 for u in usage_rows
            )
        ):
            ai_assisted += 1
        else:
            human_only += 1

    stable_total = len(outcomes)
    ai_assisted_pct = (ai_assisted / stable_total * 100) if stable_total else 0.0

    by_tool: dict[str, dict] = defaultdict(
        lambda: {
            "spendUsd": 0.0,
            "activeUsers": set(),
            "eventCount": 0,
        }
    )
    for u in usage_rows:
        src = u.source or "unknown"
        bucket = by_tool[src]
        bucket["spendUsd"] += float(u.cost_usd or 0)
        bucket["eventCount"] += 1
        if u.user_id:
            bucket["activeUsers"].add(u.user_id.strip().lower())

    tools = []
    for src, data in sorted(by_tool.items(), key=lambda x: -x[1]["spendUsd"]):
        spend = data["spendUsd"]
        tools.append(
            {
                "toolId": src,
                "toolName": SOURCE_LABELS.get(src, src.replace("-", " ").title()),
                "spendUsd": round(spend, 2),
                "spendSharePct": round(spend / total_spend * 100, 1) if total_spend else 0.0,
                "activeUsers": len(data["activeUsers"]),
                "eventCount": data["eventCount"],
            }
        )

    team_outcomes: dict[str, int] = defaultdict(int)
    team_ai: dict[str, int] = defaultdict(int)
    team_spend: dict[str, float] = defaultdict(float)
    for outcome in outcomes:
        tid = outcome.team_id or "unassigned"
        team_outcomes[tid] += 1
        author = _outcome_author(outcome)
        if _author_ai_assisted(author, ai_keys) or any(
            u.team_id == tid and float(u.cost_usd or 0) > 0 for u in usage_rows
        ):
            team_ai[tid] += 1
    for u in usage_rows:
        team_spend[u.team_id or "unassigned"] += float(u.cost_usd or 0)

    teams = []
    for tid in sorted(set(team_outcomes) | set(team_spend)):
        oc = team_outcomes.get(tid, 0)
        teams.append(
            {
                "teamId": tid,
                "teamName": tid.replace("-", " ").title(),
                "outcomes": oc,
                "aiAssistedOutcomes": team_ai.get(tid, 0),
                "aiAssistedPct": round(team_ai.get(tid, 0) / oc * 100, 1) if oc else 0.0,
                "spendUsd": round(team_spend.get(tid, 0.0), 2),
            }
        )

    weekly_output = []
    for i in range(5):
        w_end = now - timedelta(days=(4 - i) * 7)
        w_start = w_end - timedelta(days=7)
        w_out = (
            db.query(func.count())
            .filter(
                *_stable_outcome_filter(w_start, w_end, org_id=org_id, db=db),
                OutcomeEvent.occurred_at < w_end,
            )
            .scalar()
        )
        weekly_output.append(
            {
                "week": f"W{i + 1}",
                "outcomes": int(w_out or 0),
            }
        )

    distinct_ai_users = len({u.user_id for u in usage_rows if u.user_id})
    distinct_authors = len({_outcome_author(o) for o in outcomes if _outcome_author(o)})

    return {
        "periodLabel": f"Last {lookback_days} days",
        "method": "proxy_v1",
        "methodNote": (
            "AI-assisted wins are estimated from AI tool spend + GitHub author/team overlap. "
            "Not PR-level code attribution (Weave-style) until Cursor AI Code Tracking or Langfuse is connected."
        ),
        "shippedWork": {
            "stableOutcomes": stable_total,
            "outcomesPerWeek": round(stable_total / max(lookback_days / 7, 1), 1),
            "weeklyTrend": weekly_output,
        },
        "aiVsHuman": {
            "aiAssistedOutcomes": ai_assisted,
            "humanOnlyOutcomes": human_only,
            "unknownAuthorOutcomes": unknown_author,
            "aiAssistedPct": round(ai_assisted_pct, 1),
            "confidence": "medium" if ai_keys else "low",
        },
        "adoptionByTool": tools,
        "adoptionSummary": {
            "activeAiUsers": distinct_ai_users,
            "distinctAuthors": distinct_authors,
            "toolsInUse": len(tools),
            "totalSpendUsd": round(total_spend, 2),
            "adoptionRatePct": round(
                distinct_ai_users / distinct_authors * 100, 1
            )
            if distinct_authors
            else (100.0 if distinct_ai_users else 0.0),
        },
        "byTeam": teams,
        "codeAttribution": code_attribution_summary(db, org_id, lookback_days=lookback_days),
    }
