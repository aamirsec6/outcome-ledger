from __future__ import annotations

from typing import Any

import httpx

from outcome_ledger_mcp.config import AppConfig
from outcome_ledger_mcp.utils.retry import with_retry

BATCH_SIZE = 500


class OutcomeLedgerClient:
    def __init__(self, config: AppConfig):
        self.config = config
        self.base = config.outcome_ledger_url

    def _headers(self) -> dict[str, str]:
        return {"X-Api-Key": self.config.outcome_ledger_key}

    def validate(self) -> dict[str, Any]:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                f"{self.base}/v1/tenants/me",
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    def ingest_status(self) -> dict[str, Any]:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                f"{self.base}/v1/ingest/status",
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()

    def _post_batches(
        self,
        path: str,
        events: list[dict],
        field: str,
    ) -> dict[str, Any]:
        totals = {"inserted": 0, "skipped": 0, "errors": []}

        def _push_chunk(chunk: list[dict]) -> dict:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(
                    f"{self.base}{path}",
                    headers=self._headers(),
                    json={field: chunk},
                )
                resp.raise_for_status()
                return resp.json()

        for i in range(0, len(events), BATCH_SIZE):
            chunk = events[i : i + BATCH_SIZE]
            if not chunk:
                continue
            data = with_retry(lambda: _push_chunk(chunk))
            totals["inserted"] += int(data.get("inserted", 0))
            totals["skipped"] += int(data.get("skipped", 0))
            totals["errors"].extend(data.get("errors") or [])

        return totals

    def push_usage(self, events: list[dict]) -> dict[str, Any]:
        return self._post_batches("/v1/ingest/usage", events, "events")

    def push_outcomes(self, events: list[dict]) -> dict[str, Any]:
        return self._post_batches("/v1/ingest/outcomes", events, "events")

    def sync_complete(self, usage: dict, outcomes: dict) -> dict[str, Any]:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{self.base}/v1/ingest/sync-complete",
                headers=self._headers(),
                json={"usage": usage, "outcomes": outcomes},
            )
            resp.raise_for_status()
            return resp.json()

    def trigger_cloud_sync(self) -> dict[str, Any]:
        """Rebuild attribution graph after MCP ingest pushes."""
        with httpx.Client(timeout=300.0) as client:
            resp = client.post(f"{self.base}/v1/sync", headers=self._headers())
            resp.raise_for_status()
            return resp.json()
