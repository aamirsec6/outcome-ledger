from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.github_oauth import github_headers, resolve_github_token_and_repos
from app.models import OutcomeEvent
from app.team_mapping import resolve_team_for_repo

logger = logging.getLogger(__name__)

_MERGE_PR_RE = re.compile(r"^merge pull request #\d+", re.I)


def _repo_default_branch(client: httpx.Client, headers: dict, repo: str) -> str:
    resp = client.get(f"https://api.github.com/repos/{repo}", headers=headers)
    if resp.status_code != 200:
        return "main"
    return (resp.json().get("default_branch") or "main").strip()


def _commit_meta(commit: dict, repo: str, sha: str) -> dict:
    c = commit.get("commit") or {}
    author = c.get("author") or {}
    user = commit.get("author") or {}
    return {
        "title": (c.get("message") or "").split("\n")[0][:512],
        "html_url": commit.get("html_url")
        or f"https://github.com/{repo}/commit/{sha}",
        "author": (user.get("login") if isinstance(user, dict) else None)
        or author.get("name"),
        "sha": sha,
        "branch": commit.get("_branch"),
    }


def ingest_github_default_branch_commits(
    db: Session,
    *,
    org_id: str,
    lookback_days: int = 90,
    token: str | None = None,
    repos: list[str] | None = None,
) -> dict:
    """Ingest direct commits on each repo's default branch (master/main) as outcomes."""
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
    since_iso = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    inserted = 0
    updated = 0
    skipped_merge = 0
    per_repo: dict[str, dict[str, int]] = {}
    headers = github_headers(token)

    with httpx.Client(timeout=60.0) as client:
        for repo in repos:
            repo_inserted = 0
            branch = _repo_default_branch(client, headers, repo)
            page = 1
            while page <= 10:
                resp = client.get(
                    f"https://api.github.com/repos/{repo}/commits",
                    headers=headers,
                    params={"sha": branch, "since": since_iso, "per_page": 100, "page": page},
                )
                if resp.status_code == 404:
                    logger.warning("github repo not found: %s", repo)
                    break
                resp.raise_for_status()
                commits = resp.json()
                if not commits:
                    break

                for commit in commits:
                    c = commit.get("commit") or {}
                    message = (c.get("message") or "").strip()
                    first_line = message.split("\n")[0] if message else ""
                    if _MERGE_PR_RE.match(first_line):
                        skipped_merge += 1
                        continue
                    if len(commit.get("parents") or []) > 1 and "merge" in first_line.lower():
                        skipped_merge += 1
                        continue

                    author_date = (c.get("author") or {}).get("date")
                    if not author_date:
                        continue
                    occurred = datetime.fromisoformat(author_date.replace("Z", "+00:00"))
                    if occurred < since:
                        continue

                    sha = commit.get("sha") or ""
                    if not sha:
                        continue

                    ext = f"github|{repo}|commit|{sha}"
                    commit["_branch"] = branch
                    meta = _commit_meta(commit, repo, sha)
                    title = meta["title"]
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
                        existing.title = title[:512]
                        existing.raw_json = json.dumps(meta)
                        existing.team_id = team_id
                        existing.outcome_type = "default_branch_commit"
                        updated += 1
                        continue

                    db.add(
                        OutcomeEvent(
                            org_id=org_id,
                            external_id=ext,
                            outcome_type="default_branch_commit",
                            accepted=True,
                            occurred_at=occurred,
                            team_id=team_id,
                            repo=repo,
                            pr_number=None,
                            title=title[:512],
                            raw_json=json.dumps(meta),
                            reverted=False,
                        )
                    )
                    inserted += 1
                    repo_inserted += 1

                if len(commits) < 100:
                    break
                page += 1
            per_repo[repo] = {"inserted": repo_inserted, "commits": repo_inserted}

    db.flush()
    return {
        "ok": True,
        "inserted": inserted,
        "updated": updated,
        "skippedMergeCommits": skipped_merge,
        "source": "github_commits",
        "repos": repos,
        "perRepo": per_repo,
    }
