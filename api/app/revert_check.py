from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.github_oauth import github_headers
from app.github_resolve import resolve_github_token_and_repos
from app.models import OutcomeEvent

logger = logging.getLogger(__name__)


def stable_days() -> int:
    return int(os.getenv("OUTCOME_STABLE_DAYS", "7"))


def _find_revert_pr(
    client: httpx.Client,
    headers: dict[str, str],
    repo: str,
    pr_number: int,
    merged_after: datetime,
) -> bool:
    """True if a merged revert PR references the original PR after merge."""
    page = 1
    needle = f"#{pr_number}"
    while page <= 5:
        resp = client.get(
            f"https://api.github.com/repos/{repo}/pulls",
            headers=headers,
            params={"state": "closed", "per_page": 100, "page": page, "sort": "updated"},
        )
        if resp.status_code != 200:
            return False
        pulls = resp.json()
        if not pulls:
            break
        for pr in pulls:
            if not pr.get("merged_at"):
                continue
            merged_at = datetime.fromisoformat(pr["merged_at"].replace("Z", "+00:00"))
            if merged_at < merged_after:
                continue
            title = (pr.get("title") or "").lower()
            body = (pr.get("body") or "").lower()
            if "revert" in title and (needle in title or needle in body):
                return True
        if len(pulls) < 100:
            break
        page += 1
    return False


def check_reverts(db: Session, org_id: str) -> dict:
    token, repos = resolve_github_token_and_repos(db, org_id)
    if not token:
        return {"ok": False, "error": "GitHub not connected", "checked": 0, "reverted": 0}

    headers = github_headers(token)
    checked = 0
    reverted_count = 0
    now = datetime.now(timezone.utc)
    stable = timedelta(days=stable_days())

    outcomes = (
        db.query(OutcomeEvent)
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.reverted.is_(False),
        )
        .all()
    )

    with httpx.Client(timeout=60.0) as client:
        for row in outcomes:
            age = now - row.occurred_at
            if stable_days() > 0 and age < stable:
                continue
            if row.repo not in repos and repos:
                continue
            checked += 1
            if row.pr_number and _find_revert_pr(
                client, headers, row.repo, int(row.pr_number), row.occurred_at
            ):
                row.reverted = True
                row.accepted = False
                reverted_count += 1

    db.flush()
    return {
        "ok": True,
        "checked": checked,
        "reverted": reverted_count,
        "stableDays": stable_days(),
    }
