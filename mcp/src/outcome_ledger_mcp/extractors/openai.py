from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.models import UsageEvent


class OpenAIExtractor(BaseExtractor):
    source_id = "openai"

    def is_configured(self) -> bool:
        return bool(self.config.openai_api_key)

    def _headers(self) -> dict[str, str]:
        h = {"Authorization": f"Bearer {self.config.openai_api_key}"}
        if self.config.openai_org_id:
            h["OpenAI-Organization"] = self.config.openai_org_id
        if self.config.openai_project_id:
            h["OpenAI-Project"] = self.config.openai_project_id
        return h

    def test_connection(self) -> dict[str, Any]:
        if not self.is_configured():
            return {"ok": False, "error": "openai_api_key not set"}
        now = int(datetime.now(timezone.utc).timestamp())
        start = now - 86400
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                "https://api.openai.com/v1/organization/costs",
                headers=self._headers(),
                params={
                    "start_time": start,
                    "end_time": now,
                    "bucket_width": "1d",
                    "limit": 1,
                },
            )
        if resp.status_code in (401, 403, 404):
            return {
                "ok": False,
                "error": f"OpenAI billing API {resp.status_code} — use admin key with api.usage.read",
            }
        if resp.status_code >= 400:
            return {"ok": False, "error": f"OpenAI API {resp.status_code}"}
        return {"ok": True}

    def fetch_usage(self, since: timedelta) -> list[UsageEvent]:
        if not self.is_configured():
            return []
        now = datetime.now(timezone.utc)
        start = now - since
        start_ts = int(start.timestamp())
        end_ts = int(now.timestamp())
        project_filter = self.config.openai_project_id
        events: list[UsageEvent] = []
        page: str | None = None

        with httpx.Client(timeout=60.0) as client:
            while True:
                params: dict = {
                    "start_time": start_ts,
                    "end_time": end_ts,
                    "bucket_width": "1d",
                    "limit": 31,
                    "group_by": "project_id",
                }
                if page:
                    params["page"] = page
                resp = client.get(
                    "https://api.openai.com/v1/organization/costs",
                    headers=self._headers(),
                    params=params,
                )
                if resp.status_code >= 400:
                    break
                payload = resp.json()
                for bucket in payload.get("data") or []:
                    bucket_start = bucket.get("start_time") or start_ts
                    bucket_end = bucket.get("end_time") or end_ts
                    period_start = datetime.fromtimestamp(bucket_start, tz=timezone.utc)
                    period_end = datetime.fromtimestamp(bucket_end, tz=timezone.utc)
                    for row in bucket.get("results") or []:
                        if project_filter:
                            row_project = (row.get("project_id") or "").strip()
                            if row_project and row_project != project_filter:
                                continue
                        amount = row.get("amount") or {}
                        cost = float(amount.get("value") or 0)
                        if cost <= 0:
                            continue
                        line_item = str(row.get("line_item") or "unknown")
                        proj = row.get("project_id") or project_filter or "default"
                        ext = hashlib.sha256(
                            f"openai|{bucket_start}|{proj}|{line_item}|{cost}".encode()
                        ).hexdigest()[:32]
                        events.append(
                            UsageEvent(
                                external_id=ext,
                                source="openai",
                                cost_usd=cost,
                                period_start=period_start,
                                period_end=period_end,
                                model=line_item,
                                team_id="unassigned",
                            )
                        )
                if not payload.get("has_more"):
                    break
                page = payload.get("next_page")
                if not page:
                    break
        return events
