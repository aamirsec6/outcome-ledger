"""AI adoption, shipped output, and AI-assisted win proxies (Weave-adjacent metrics)."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.metrics import _stable_outcome_filter
from app.models import CommitAiMetrics, OutcomeEvent, UsageEvent
from app.org_credentials import vendor_configured_for_org
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


def _build_adoption_diagnostics(
    *,
    total_spend: float,
    stable_total: int,
    ai_assisted: int,
    ai_assisted_pct: float,
    distinct_ai_users: int,
    team_outcomes: dict[str, int],
    team_spend: dict[str, float],
    code_attribution: dict,
    cursor_api_configured: bool,
) -> list[dict]:
    """Plain-language hints when AI metrics look empty or misleading."""
    hints: list[dict] = []

    if stable_total == 0:
        hints.append(
            {
                "id": "no_wins",
                "severity": "info",
                "title": "No shipped wins yet",
                "body": "Connect GitHub and run Sync so merged PRs show up here.",
                "actionLabel": "Connect GitHub",
                "actionHref": "/integrations",
            }
        )

    if total_spend <= 0:
        hints.append(
            {
                "id": "no_spend",
                "severity": "info",
                "title": "No AI spend ingested",
                "body": "Upload Cursor billing or connect spend via MCP, then Sync.",
                "actionLabel": "Add AI spend",
                "actionHref": "/integrations",
            }
        )

    win_teams = {
        tid for tid, count in team_outcomes.items() if count > 0 and tid != "unassigned"
    }
    spend_teams = {
        tid for tid, spend in team_spend.items() if spend > 0 and tid != "unassigned"
    }
    if (
        stable_total > 0
        and total_spend > 0
        and ai_assisted_pct == 0
        and win_teams
        and spend_teams
        and not (win_teams & spend_teams)
    ):
        win_label = ", ".join(sorted(win_teams)[:3])
        spend_label = ", ".join(sorted(spend_teams)[:3])
        hints.append(
            {
                "id": "team_mismatch",
                "severity": "warning",
                "title": "Wins and spend are on different teams",
                "body": (
                    f"Wins roll up to {win_label} but spend is tagged to {spend_label}. "
                    "AI-assisted wins need the same team on repos and bills."
                ),
                "actionLabel": "Fix team tags",
                "actionHref": "/settings?section=teams",
            }
        )

    if total_spend > 0 and distinct_ai_users == 0:
        hints.append(
            {
                "id": "no_billed_users",
                "severity": "info",
                "title": "Spend has no per-user breakdown",
                "body": (
                    "Your Cursor upload is org-level totals only. "
                    "We cannot match PR authors to billed users until CSV rows include user/email "
                    "or you connect Cursor Team API."
                ),
                "actionLabel": "Connect Cursor API",
                "actionHref": "/integrations",
            }
        )

    if not cursor_api_configured and total_spend > 0:
        hints.append(
            {
                "id": "no_cursor_api",
                "severity": "info",
                "title": "Exact AI line counts need Cursor Team API",
                "body": (
                    "Without the Admin API, AI vs human code is guessed from git trailers "
                    "and spend timing — often 0% AI until you connect."
                ),
                "actionLabel": "Set up Cursor API",
                "actionHref": "/integrations",
            }
        )

    if code_attribution.get("available") and (code_attribution.get("aiPct") or 0) == 0:
        methods = code_attribution.get("byMethod") or {}
        team_mismatch = any(h["id"] == "team_mismatch" for h in hints)
        if not methods.get("cursor_api") and not team_mismatch:
            hints.append(
                {
                    "id": "zero_ai_lines",
                    "severity": "warning",
                    "title": "0% AI code lines detected",
                    "body": (
                        "Commits lack Co-authored-by / Cursor trailers and spend is not tied "
                        "to each PR. Connect Cursor Team API or tag repos to the same team as spend."
                    ),
                    "actionLabel": "Improve attribution",
                    "actionHref": "/integrations",
                }
            )

    return hints


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

    code_attribution = code_attribution_summary(db, org_id, lookback_days=lookback_days)
    cursor_api = vendor_configured_for_org(db, org_id, "cursor") or (
        db.query(CommitAiMetrics.id).filter(CommitAiMetrics.org_id == org_id).first()
        is not None
    )
    diagnostics = _build_adoption_diagnostics(
        total_spend=total_spend,
        stable_total=stable_total,
        ai_assisted=ai_assisted,
        ai_assisted_pct=ai_assisted_pct,
        distinct_ai_users=distinct_ai_users,
        team_outcomes=dict(team_outcomes),
        team_spend=dict(team_spend),
        code_attribution=code_attribution,
        cursor_api_configured=bool(cursor_api),
    )

    return {
        "periodLabel": f"Last {lookback_days} days",
        "method": "proxy_v1",
        "methodNote": (
            "Shipped wins come from GitHub. AI-assisted % links spend to PR teams or authors. "
            "Line-level AI % needs Cursor Team API for accuracy."
        ),
        "diagnostics": diagnostics,
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
        "codeAttribution": code_attribution,
    }
