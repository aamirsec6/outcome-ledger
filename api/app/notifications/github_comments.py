"""Post attributed AI cost as GitHub PR comments after merge."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.github_oauth import github_headers
from app.github_resolve import resolve_github_token_and_repos
from app.models import AttributionLink, OutcomeEvent

logger = logging.getLogger(__name__)

COMMENT_MARKER = "<!-- outcome-ledger-cost -->"


def _allocated_spend_by_outcome(db: Session, org_id: str, outcome_ids: list[str]) -> dict[str, float]:
    if not outcome_ids:
        return {}
    links = (
        db.query(AttributionLink)
        .filter(
            AttributionLink.org_id == org_id,
            AttributionLink.outcome_event_id.in_(outcome_ids),
        )
        .all()
    )
    totals: dict[str, float] = defaultdict(float)
    for link in links:
        totals[link.outcome_event_id] += float(link.allocated_usd or 0)
    return dict(totals)


def _comment_body(*, title: str, spend_usd: float, cpst_note: str) -> str:
    spend = f"${spend_usd:,.2f}"
    return (
        f"{COMMENT_MARKER}\n"
        f"**Outcome Ledger** — attributed AI spend for this win\n\n"
        f"**PR:** {title}\n"
        f"**Attributed AI cost:** {spend}\n"
        f"{cpst_note}\n\n"
        f"_Spend linked via time-window attribution. Review in Outcome Ledger dashboard._"
    )


def post_pr_cost_comments(
    db: Session,
    org_id: str,
    *,
    new_outcome_ids: list[str] | None = None,
) -> dict:
    token, _repos = resolve_github_token_and_repos(db, org_id)
    if not token:
        return {"ok": False, "error": "GitHub not connected", "posted": 0}

    q = db.query(OutcomeEvent).filter(
        OutcomeEvent.org_id == org_id,
        OutcomeEvent.pr_number.isnot(None),
        OutcomeEvent.cost_comment_posted_at.is_(None),
        OutcomeEvent.accepted.is_(True),
    )
    if new_outcome_ids:
        q = q.filter(OutcomeEvent.id.in_(new_outcome_ids))
    outcomes = q.order_by(OutcomeEvent.occurred_at.desc()).limit(25).all()
    if not outcomes:
        return {"ok": True, "posted": 0, "skipped": "no pending PRs"}

    spend_map = _allocated_spend_by_outcome(db, org_id, [o.id for o in outcomes])
    headers = github_headers(token)
    posted = 0
    errors: list[str] = []

    with httpx.Client(timeout=30.0) as client:
        for outcome in outcomes:
            spend = spend_map.get(outcome.id, 0.0)
            if spend <= 0:
                continue
            repo = (outcome.repo or "").strip()
            pr_num = outcome.pr_number
            if not repo or not pr_num:
                continue
            body = _comment_body(
                title=(outcome.title or f"PR #{pr_num}")[:120],
                spend_usd=spend,
                cpst_note=f"Posted {datetime.now(timezone.utc).strftime('%Y-%m-%d')} UTC",
            )
            url = f"https://api.github.com/repos/{repo}/issues/{pr_num}/comments"
            try:
                resp = client.post(url, headers=headers, json={"body": body})
                if resp.status_code in (401, 403):
                    return {
                        "ok": False,
                        "error": "GitHub token lacks permission to comment on PRs",
                        "posted": posted,
                    }
                if resp.status_code >= 400:
                    errors.append(f"{repo}#{pr_num}: HTTP {resp.status_code}")
                    continue
                outcome.cost_comment_posted_at = datetime.now(timezone.utc)
                posted += 1
            except Exception as exc:
                errors.append(f"{repo}#{pr_num}: {exc}")
                logger.warning("PR comment failed %s#%s: %s", repo, pr_num, exc)

    db.flush()
    return {"ok": True, "posted": posted, "errors": errors[:5]}
