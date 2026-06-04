from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.extractors.csv_util import find_latest_csv, parse_usage_csv
from outcome_ledger_mcp.extractors.github import _github_headers
from outcome_ledger_mcp.models import UsageEvent


class CopilotExtractor(BaseExtractor):
    source_id = "copilot"

    def is_configured(self) -> bool:
        return bool(self.config.github_token)

    def test_connection(self) -> dict[str, Any]:
        if not self.config.github_token:
            return {"ok": False, "error": "github_token required for Copilot metrics"}
        org = self._org_login()
        if org:
            return {"ok": True, "org": org, "mode": "api"}
        path = find_latest_csv(
            self.config.watch_paths,
            name_patterns=("**/*copilot*.csv", "**/*Copilot*.csv"),
        )
        if path:
            return {"ok": True, "file": str(path), "mode": "csv"}
        return {
            "ok": False,
            "error": "Copilot API unavailable (needs GitHub Enterprise); no CSV found",
        }

    def _org_login(self) -> str | None:
        with httpx.Client(timeout=30.0) as client:
            user = client.get(
                "https://api.github.com/user",
                headers=_github_headers(self.config.github_token),
            )
            if user.status_code != 200:
                return None
            return user.json().get("login")

    def fetch_usage(self, since: timedelta) -> list[UsageEvent]:
        events = self._fetch_from_api(since)
        if events:
            return events
        path = find_latest_csv(
            self.config.watch_paths,
            name_patterns=("**/*copilot*.csv", "**/*Copilot*.csv"),
        )
        if not path:
            return []
        since_dt = datetime.now(timezone.utc) - since
        return parse_usage_csv(
            path.read_text(encoding="utf-8-sig"),
            source="copilot",
            since=since_dt,
            user_column="user_email",
        )

    def _fetch_from_api(self, since: timedelta) -> list[UsageEvent]:
        org = self._org_login()
        if not org:
            return []
        since_dt = datetime.now(timezone.utc) - since
        events: list[UsageEvent] = []
        headers = _github_headers(self.config.github_token)
        urls = [
            f"https://api.github.com/orgs/{org}/copilot/billing/seats",
            f"https://api.github.com/orgs/{org}/copilot/metrics",
        ]
        with httpx.Client(timeout=60.0) as client:
            for url in urls:
                resp = client.get(headers=headers, url=url)
                if resp.status_code in (401, 403, 404):
                    continue
                if resp.status_code >= 400:
                    continue
                data = resp.json()
                seats = data if isinstance(data, list) else data.get("seats") or []
                for seat in seats:
                    if not isinstance(seat, dict):
                        continue
                    user = (
                        (seat.get("assignee") or {}).get("login")
                        or seat.get("login")
                        or seat.get("user")
                    )
                    cost = float(seat.get("cost_usd") or seat.get("monthly_cost") or 0)
                    if cost <= 0:
                        continue
                    day = datetime.now(timezone.utc).replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    if day < since_dt:
                        continue
                    ext = hashlib.sha256(
                        f"copilot|{org}|{user}|{day.isoformat()}|{cost}".encode()
                    ).hexdigest()[:32]
                    events.append(
                        UsageEvent(
                            external_id=ext,
                            source="copilot",
                            cost_usd=cost,
                            period_start=day,
                            period_end=day.replace(hour=23, minute=59, second=59),
                            user_id=str(user) if user else None,
                            team_id="unassigned",
                        )
                    )
        return events
