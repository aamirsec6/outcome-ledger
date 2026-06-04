from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.github_oauth import github_headers, resolve_github_token_and_repos
from app.models import OutcomeEvent
from app.team_mapping import resolve_team_for_repo

logger = logging.getLogger(__name__)


def _pr_meta(pr: dict, repo: str) -> dict:
    user = pr.get("user") or {}
    return {
        "title": pr.get("title"),
        "html_url": pr.get("html_url") or f"https://github.com/{repo}/pull/{pr['number']}",
        "author": user.get("login"),
        "labels": [lb.get("name") for lb in (pr.get("labels") or []) if lb.get("name")],
        "merged_at": pr.get("merged_at"),
    }


def ingest_github_merged_prs(
    db: Session,
    *,
    org_id: str,
    lookback_days: int = 90,
    token: str | None = None,
    repos: list[str] | None = None,
) -> dict:
    if token is None or repos is None:
        token, repos = resolve_github_token_and_repos(db, org_id)

    if not token:
        return {
            "ok": False,
            "error": "GitHub not connected — use Connect GitHub or set GITHUB_TOKEN",
            "inserted": 0,
        }
    if not repos:
        return {
            "ok": False,
            "error": "No repos selected — pick repos after connecting GitHub",
            "inserted": 0,
        }

    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    inserted = 0
    updated = 0
    per_repo: dict[str, dict[str, int]] = {}
    headers = github_headers(token)

    with httpx.Client(timeout=60.0) as client:
        for repo in repos:
            repo_inserted = 0
            repo_updated = 0
            page = 1
            while page <= 10:
                resp = client.get(
                    f"https://api.github.com/repos/{repo}/pulls",
                    headers=headers,
                    params={"state": "closed", "per_page": 100, "page": page},
                )
                if resp.status_code == 404:
                    logger.warning("github repo not found: %s", repo)
                    break
                resp.raise_for_status()
                pulls = resp.json()
                if not pulls:
                    break

                for pr in pulls:
                    merged_at = pr.get("merged_at")
                    if not merged_at:
                        continue
                    merged_dt = datetime.fromisoformat(
                        merged_at.replace("Z", "+00:00")
                    )
                    if merged_dt < since:
                        continue

                    pr_num = int(pr["number"])
                    ext = f"github|{repo}|{pr_num}"
                    meta = _pr_meta(pr, repo)
                    team_id = resolve_team_for_repo(db, org_id, repo)
                    existing = (
                        db.query(OutcomeEvent)
                        .filter(
                            OutcomeEvent.org_id == org_id,
                            OutcomeEvent.external_id == ext,
                        )
                        .first()
                    )
                    if existing:
                        existing.title = (pr.get("title") or "")[:512]
                        existing.raw_json = json.dumps(meta)
                        existing.team_id = team_id
                        updated += 1
                        repo_updated += 1
                        continue

                    db.add(
                        OutcomeEvent(
                            org_id=org_id,
                            external_id=ext,
                            outcome_type="pr_merged_stable",
                            accepted=True,
                            occurred_at=merged_dt,
                            team_id=team_id,
                            repo=repo,
                            pr_number=pr_num,
                            title=(pr.get("title") or "")[:512],
                            raw_json=json.dumps(meta),
                            reverted=False,
                        )
                    )
                    inserted += 1
                    repo_inserted += 1

                if len(pulls) < 100:
                    break
                page += 1
            per_repo[repo] = {
                "inserted": repo_inserted,
                "updated": repo_updated,
                "mergedPrs": repo_inserted + repo_updated,
            }

    db.flush()
    return {
        "ok": True,
        "inserted": inserted,
        "updated": updated,
        "source": "github",
        "repos": repos,
        "perRepo": per_repo,
    }
