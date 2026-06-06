"""Roll up AI vs human code lines per merged PR (3-tier: API, git, estimate)."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.github_resolve import resolve_github_token_and_repos
from app.github_oauth import github_headers
from app.models import CommitAiMetrics, OutcomeEvent, PrCodeAttribution, UsageEvent

logger = logging.getLogger(__name__)

AI_TRAILER_PCT = {
    "generated-by": 90.0,
    "co-authored-by": 55.0,
    "assisted-by": 33.0,
}
AI_TOOL_MARKERS = ("cursor", "copilot", "claude", "openai", "anthropic", "devin", "windsurf")


def _default_ai_pct() -> float:
    return float(os.getenv("OUTCOME_DEFAULT_AI_CODE_PCT", "75"))


def _outcome_author(outcome: OutcomeEvent) -> str | None:
    if not outcome.raw_json:
        return None
    try:
        return (json.loads(outcome.raw_json).get("author") or "").strip() or None
    except json.JSONDecodeError:
        return None


def _author_keys(author: str | None) -> set[str]:
    if not author:
        return set()
    a = author.lower()
    return {a, a.replace("-", ""), a.replace("_", "")}


def _author_matches_usage(author: str | None, usage: UsageEvent) -> bool:
    if not author or not usage.user_id:
        return False
    keys = _author_keys(author)
    uid = usage.user_id.lower()
    local = uid.split("@", 1)[0]
    return any(k in uid or uid in k or k == local or local in k for k in keys)


def ai_pct_from_commit_message(message: str) -> tuple[float, str] | None:
    lower = message.lower()
    best_pct = 0.0
    best_label = ""
    for line in lower.splitlines():
        line = line.strip()
        for prefix, pct in AI_TRAILER_PCT.items():
            if line.startswith(prefix):
                trailer = line[len(prefix) :].strip()
                if any(m in trailer for m in AI_TOOL_MARKERS) or prefix == "generated-by":
                    if pct > best_pct:
                        best_pct = pct
                        best_label = prefix
    if best_pct > 0:
        return best_pct, best_label
    return None


def _fetch_pr_commits(
    client: httpx.Client,
    *,
    headers: dict,
    repo: str,
    pr_number: int,
) -> list[dict]:
    resp = client.get(
        f"https://api.github.com/repos/{repo}/pulls/{pr_number}/commits",
        headers=headers,
        params={"per_page": 100},
    )
    if resp.status_code != 200:
        return []
    return resp.json()


def _fetch_pr_stats(
    client: httpx.Client,
    *,
    headers: dict,
    repo: str,
    pr_number: int,
) -> tuple[int, int]:
    resp = client.get(
        f"https://api.github.com/repos/{repo}/pulls/{pr_number}",
        headers=headers,
    )
    if resp.status_code != 200:
        return 0, 0
    data = resp.json()
    return int(data.get("additions") or 0), int(data.get("deletions") or 0)


def _usage_near_outcome(
    db: Session, org_id: str, outcome: OutcomeEvent, *, days: int = 14
) -> list[UsageEvent]:
    start = outcome.occurred_at - timedelta(days=days)
    end = outcome.occurred_at + timedelta(days=2)
    rows = (
        db.query(UsageEvent)
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.period_start >= start,
            UsageEvent.period_start <= end,
            UsageEvent.cost_usd > 0,
        )
        .all()
    )
    author = _outcome_author(outcome)
    if author:
        matched = [u for u in rows if _author_matches_usage(author, u)]
        if matched:
            return matched
    if outcome.team_id:
        team_rows = [u for u in rows if u.team_id == outcome.team_id]
        if team_rows:
            return team_rows
    return rows


def _commit_sha(outcome: OutcomeEvent) -> str | None:
    parts = (outcome.external_id or "").split("|")
    if len(parts) >= 4 and parts[2] == "commit":
        return parts[3].lower()
    if outcome.raw_json:
        try:
            sha = json.loads(outcome.raw_json).get("sha")
            if sha:
                return str(sha).lower()
        except json.JSONDecodeError:
            pass
    return None


def rebuild_pr_code_attribution(
    db: Session,
    org_id: str,
    *,
    lookback_days: int = 90,
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
        .all()
    )
    commit_cache = {
        r.commit_hash: r
        for r in db.query(CommitAiMetrics).filter(CommitAiMetrics.org_id == org_id).all()
    }

    token, _repos = resolve_github_token_and_repos(db, org_id)
    headers = github_headers(token) if token else {}

    created = 0
    updated = 0
    by_method: dict[str, int] = {}

    with httpx.Client(timeout=60.0) as client:
        for outcome in outcomes:
            if not outcome.repo:
                continue
            repo = outcome.repo
            pr_num = int(outcome.pr_number) if outcome.pr_number else None
            direct_sha = _commit_sha(outcome)

            ai_lines = 0
            human_lines = 0
            total_lines = 0
            method = "unavailable"
            confidence = 0.0
            commit_count = 0

            commits: list[dict] = []
            if direct_sha and token:
                resp = client.get(
                    f"https://api.github.com/repos/{repo}/commits/{direct_sha}",
                    headers=headers,
                )
                if resp.status_code == 200:
                    commits = [resp.json()]
            elif pr_num and token:
                commits = _fetch_pr_commits(
                    client, headers=headers, repo=repo, pr_number=pr_num
                )

            if commits:
                commit_count = len(commits)
                api_hits = 0
                trailer_hits = 0
                for c in commits:
                    sha = (c.get("sha") or "").lower()
                    cached = commit_cache.get(sha)
                    if cached and cached.total_lines_added > 0:
                        ai_lines += cached.ai_lines_added
                        human_lines += cached.human_lines_added
                        total_lines += cached.total_lines_added
                        api_hits += 1
                        continue
                    msg = (c.get("commit") or {}).get("message") or ""
                    trailer = ai_pct_from_commit_message(msg)
                    adds = 0
                    if token:
                        # light per-commit stats unavailable; use PR split later
                        pass
                    if trailer:
                        pct, _ = trailer
                        est_total = max(adds, 1)
                        ai_lines += int(est_total * pct / 100)
                        human_lines += est_total - int(est_total * pct / 100)
                        total_lines += est_total
                        trailer_hits += 1

                if api_hits > 0:
                    method = "cursor_api"
                    confidence = 0.92
                elif trailer_hits > 0:
                    method = "git_trailer"
                    confidence = 0.65

            if total_lines <= 0 and token and pr_num:
                additions, _ = _fetch_pr_stats(
                    client, headers=headers, repo=repo, pr_number=pr_num
                )
                if additions > 0:
                    nearby = _usage_near_outcome(db, org_id, outcome)
                    if nearby:
                        spend = sum(float(u.cost_usd or 0) for u in nearby)
                        org_spend = (
                            db.query(UsageEvent)
                            .filter(
                                UsageEvent.org_id == org_id,
                                UsageEvent.period_start >= since,
                            )
                            .all()
                        )
                        max_spend = max(
                            (float(u.cost_usd or 0) for u in org_spend),
                            default=0.0,
                        )
                        if max_spend > 0 and spend > 0:
                            intensity = min(1.0, spend / max_spend)
                            ai_pct = min(
                                95.0,
                                _default_ai_pct() * 0.5 + intensity * 45.0,
                            )
                        else:
                            ai_pct = _default_ai_pct()
                        method = "spend_correlated"
                        confidence = 0.55
                    else:
                        ai_pct = 0.0
                        method = "github_diff"
                        confidence = 0.4
                    ai_lines = int(additions * ai_pct / 100)
                    human_lines = additions - ai_lines
                    total_lines = additions

            if total_lines <= 0 and direct_sha and commits:
                c = commits[0]
                stats = (c.get("stats") or {})
                additions = int(stats.get("additions") or 0)
                if additions > 0:
                    nearby = _usage_near_outcome(db, org_id, outcome)
                    ai_pct = _default_ai_pct() if nearby else 0.0
                    method = "spend_correlated" if nearby else "github_diff"
                    confidence = 0.55 if nearby else 0.4
                    ai_lines = int(additions * ai_pct / 100)
                    human_lines = additions - ai_lines
                    total_lines = additions
                    sha = direct_sha
                    cached = commit_cache.get(sha)
                    if cached and cached.total_lines_added > 0:
                        ai_lines = cached.ai_lines_added
                        human_lines = cached.human_lines_added
                        total_lines = cached.total_lines_added
                        method = "cursor_api"
                        confidence = 0.92

            if total_lines <= 0:
                continue

            ai_pct = round(ai_lines / total_lines * 100, 1) if total_lines else 0.0
            row = (
                db.query(PrCodeAttribution)
                .filter(
                    PrCodeAttribution.org_id == org_id,
                    PrCodeAttribution.outcome_event_id == outcome.id,
                )
                .first()
            )
            payload = {
                "ai_lines_added": ai_lines,
                "human_lines_added": human_lines,
                "total_lines_added": total_lines,
                "ai_pct": ai_pct,
                "method": method,
                "confidence": confidence,
                "commit_count": commit_count,
                "updated_at": datetime.now(timezone.utc),
            }
            if row:
                for k, v in payload.items():
                    setattr(row, k, v)
                updated += 1
            else:
                db.add(
                    PrCodeAttribution(
                        org_id=org_id,
                        outcome_event_id=outcome.id,
                        **payload,
                    )
                )
                created += 1
            by_method[method] = by_method.get(method, 0) + 1

    db.flush()
    totals = (
        db.query(PrCodeAttribution)
        .filter(PrCodeAttribution.org_id == org_id)
        .all()
    )
    sum_ai = sum(r.ai_lines_added for r in totals)
    sum_human = sum(r.human_lines_added for r in totals)
    sum_total = sum(r.total_lines_added for r in totals)
    return {
        "ok": True,
        "created": created,
        "updated": updated,
        "prsAttributed": len(totals),
        "byMethod": by_method,
        "orgAiPct": round(sum_ai / sum_total * 100, 1) if sum_total else 0.0,
        "orgAiLines": sum_ai,
        "orgHumanLines": sum_human,
        "orgTotalLines": sum_total,
    }


def code_attribution_summary(db: Session, org_id: str, *, lookback_days: int = 90) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    rows = (
        db.query(PrCodeAttribution, OutcomeEvent)
        .join(OutcomeEvent, OutcomeEvent.id == PrCodeAttribution.outcome_event_id)
        .filter(
            PrCodeAttribution.org_id == org_id,
            OutcomeEvent.occurred_at >= since,
        )
        .all()
    )
    if not rows:
        return {
            "available": False,
            "reason": "No PR code attribution yet — run sync after connecting GitHub + Cursor",
        }
    ai = sum(r.PrCodeAttribution.ai_lines_added for r in rows)
    human = sum(r.PrCodeAttribution.human_lines_added for r in rows)
    total = sum(r.PrCodeAttribution.total_lines_added for r in rows)
    methods: dict[str, int] = {}
    for r in rows:
        m = r.PrCodeAttribution.method
        methods[m] = methods.get(m, 0) + 1
    high_conf = [r for r in rows if r.PrCodeAttribution.confidence >= 0.8]
    return {
        "available": True,
        "aiLines": ai,
        "humanLines": human,
        "totalLines": total,
        "aiPct": round(ai / total * 100, 1) if total else 0.0,
        "humanPct": round(human / total * 100, 1) if total else 0.0,
        "prsCounted": len(rows),
        "highConfidencePrs": len(high_conf),
        "byMethod": methods,
        "confidenceNote": _confidence_note(methods),
    }


def _confidence_note(methods: dict[str, int]) -> str:
    if methods.get("cursor_api", 0) > 0:
        return "Includes Cursor commit-level AI line counts (high accuracy)."
    if methods.get("git_trailer", 0) > 0:
        return "Mix of git co-authorship trailers and spend-based estimates."
    if methods.get("spend_correlated", 0) > 0:
        return (
            "Estimated from GitHub diff size + AI spend timing. "
            "Connect Cursor Admin API for exact line counts."
        )
    return "Limited data — connect Cursor API or tag commits with Co-authored-by."
