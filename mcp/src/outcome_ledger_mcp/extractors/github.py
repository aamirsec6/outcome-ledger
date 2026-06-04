from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from outcome_ledger_mcp.config import AppConfig
from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.models import OutcomeEvent


def _github_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


class GitHubExtractor(BaseExtractor):
    source_id = "github"

    def is_configured(self) -> bool:
        return bool(self.config.github_token and self.config.github_repos)

    def test_connection(self) -> dict[str, Any]:
        if not self.config.github_token:
            return {"ok": False, "error": "github_token not set"}
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                "https://api.github.com/user",
                headers=_github_headers(self.config.github_token),
            )
        if resp.status_code != 200:
            return {"ok": False, "error": f"GitHub API {resp.status_code}"}
        return {"ok": True, "login": resp.json().get("login")}

    def fetch_outcomes(self, since: timedelta) -> list[OutcomeEvent]:
        if not self.is_configured():
            return []
        since_dt = datetime.now(timezone.utc) - since
        events: list[OutcomeEvent] = []
        headers = _github_headers(self.config.github_token)

        with httpx.Client(timeout=60.0) as client:
            for repo in self.config.github_repos:
                page = 1
                while page <= 10:
                    resp = client.get(
                        f"https://api.github.com/repos/{repo}/pulls",
                        headers=headers,
                        params={"state": "closed", "per_page": 100, "page": page},
                    )
                    if resp.status_code == 404:
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
                        if merged_dt < since_dt:
                            continue
                        pr_num = int(pr["number"])
                        user = pr.get("user") or {}
                        author = user.get("login")
                        ext = f"github|{repo}|{pr_num}"
                        meta = {
                            "title": pr.get("title"),
                            "author": author,
                            "html_url": pr.get("html_url"),
                            "merged_at": merged_at,
                        }
                        team_id = repo.split("/")[0] if "/" in repo else "unassigned"
                        events.append(
                            OutcomeEvent(
                                external_id=ext,
                                source="github",
                                outcome_type="pr_merged_stable",
                                accepted=True,
                                occurred_at=merged_dt,
                                repo=repo,
                                pr_number=pr_num,
                                author=author,
                                team_id=team_id,
                                metadata=meta,
                            )
                        )
                    if len(pulls) < 100:
                        break
                    page += 1
        return events
