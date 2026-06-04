from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.models import UsageEvent

ANTHROPIC_API = "https://api.anthropic.com/v1/organizations/cost_report"


class AnthropicExtractor(BaseExtractor):
    source_id = "anthropic"

    def is_configured(self) -> bool:
        key = self.config.anthropic_api_key
        return bool(key) and key.startswith("sk-ant-admin")

    def test_connection(self) -> dict[str, Any]:
        if not self.config.anthropic_api_key:
            return {"ok": False, "error": "anthropic_api_key not set"}
        if not self.config.anthropic_api_key.startswith("sk-ant-admin"):
            return {"ok": False, "error": "Requires Admin key (sk-ant-admin...)"}
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=1)
        headers = {
            "x-api-key": self.config.anthropic_api_key,
            "anthropic-version": "2023-06-01",
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                ANTHROPIC_API,
                headers=headers,
                params={
                    "starting_at": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "ending_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "bucket_width": "1d",
                    "limit": 1,
                },
            )
        if resp.status_code == 401:
            return {"ok": False, "error": "Anthropic unauthorized"}
        if resp.status_code >= 400:
            return {"ok": False, "error": f"Anthropic API {resp.status_code}"}
        return {"ok": True}

    def fetch_usage(self, since: timedelta) -> list[UsageEvent]:
        if not self.is_configured():
            return []
        now = datetime.now(timezone.utc)
        start = now - since
        headers = {
            "x-api-key": self.config.anthropic_api_key,
            "anthropic-version": "2023-06-01",
        }
        events: list[UsageEvent] = []
        chunk_start = start

        with httpx.Client(timeout=60.0) as client:
            while chunk_start < now:
                chunk_end = min(chunk_start + timedelta(days=31), now)
                page: str | None = None
                while True:
                    params: dict = {
                        "starting_at": chunk_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "ending_at": chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "bucket_width": "1d",
                        "limit": 31,
                    }
                    if page:
                        params["page"] = page
                    resp = client.get(ANTHROPIC_API, headers=headers, params=params)
                    if resp.status_code >= 400:
                        break
                    payload = resp.json()
                    for bucket in payload.get("data") or []:
                        starting_at = bucket.get("starting_at") or chunk_start.isoformat()
                        try:
                            period_start = datetime.fromisoformat(
                                starting_at.replace("Z", "+00:00")
                            )
                        except ValueError:
                            period_start = chunk_start
                        period_end = period_start + timedelta(days=1)
                        bucket_cents = 0.0
                        models: list[str] = []
                        for row in bucket.get("results") or []:
                            try:
                                bucket_cents += float(row.get("amount") or 0)
                            except (TypeError, ValueError):
                                continue
                            if row.get("model"):
                                models.append(str(row["model"]))
                        cost_usd = bucket_cents / 100.0
                        if cost_usd <= 0:
                            continue
                        day_key = period_start.strftime("%Y-%m-%d")
                        model_label = models[0] if models else "anthropic"
                        ext = hashlib.sha256(
                            f"anthropic|{day_key}|{cost_usd:.4f}".encode()
                        ).hexdigest()[:32]
                        events.append(
                            UsageEvent(
                                external_id=ext,
                                source="anthropic",
                                cost_usd=cost_usd,
                                period_start=period_start,
                                period_end=period_end,
                                model=model_label,
                                team_id="unassigned",
                            )
                        )
                    if not payload.get("has_more"):
                        break
                    page = payload.get("next_page")
                    if not page:
                        break
                chunk_start = chunk_end
        return events
