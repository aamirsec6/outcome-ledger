from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from outcome_ledger_mcp.api_client import OutcomeLedgerClient
from outcome_ledger_mcp.cache import EventCache
from outcome_ledger_mcp.config import AppConfig
from outcome_ledger_mcp.extractors import (
    AnthropicExtractor,
    ClaudeCodeExtractor,
    CopilotExtractor,
    CursorExtractor,
    GitHubExtractor,
    OpenAIExtractor,
)
from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.utils.logger import setup_logging


def parse_since(since: str) -> timedelta:
    m = re.match(r"^(\d+)(d|h)$", since.strip().lower())
    if not m:
        raise ValueError(f"Invalid --since: {since} (use e.g. 30d or 24h)")
    n, unit = int(m.group(1)), m.group(2)
    if unit == "d":
        return timedelta(days=n)
    return timedelta(hours=n)


def all_extractors(config: AppConfig) -> list[BaseExtractor]:
    return [
        OpenAIExtractor(config),
        AnthropicExtractor(config),
        CursorExtractor(config),
        ClaudeCodeExtractor(config),
        CopilotExtractor(config),
        GitHubExtractor(config),
    ]


class SyncManager:
    def __init__(self, config: AppConfig | None = None):
        self.config = config or AppConfig.load()
        self.cache = EventCache()
        self.client = OutcomeLedgerClient(self.config)
        self.log = setup_logging()

    def test_connections(self, source: str | None = None) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for ext in all_extractors(self.config):
            if source and ext.source_id != source:
                continue
            if not ext.is_configured():
                out[ext.source_id] = {"ok": False, "skipped": True, "error": "not configured"}
                continue
            try:
                out[ext.source_id] = ext.test_connection()
            except Exception as exc:
                out[ext.source_id] = {"ok": False, "error": str(exc)}
        return out

    def list_sources(self) -> dict[str, Any]:
        configured = self.config.configured_sources()
        extractors = {e.source_id: e.is_configured() for e in all_extractors(self.config)}
        return {"configured": configured, "extractors": extractors}

    def sync_all(
        self,
        *,
        since: str = "90d",
        source: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        delta = parse_since(since)
        if not self.config.outcome_ledger_key:
            raise ValueError("outcome_ledger_key not set — run configure first")

        tenant = self.client.validate()
        self.log.info("Workspace: %s", tenant.get("name") or tenant.get("orgId"))

        usage_events: list[dict] = []
        outcome_events: list[dict] = []
        per_source: dict[str, Any] = {}

        for ext in all_extractors(self.config):
            if source and ext.source_id != source:
                continue
            if not ext.is_configured():
                per_source[ext.source_id] = {"ok": True, "skipped": True}
                continue
            try:
                u = ext.fetch_usage(delta)
                o = ext.fetch_outcomes(delta)
                usage_events.extend([e.to_ingest() for e in u])
                outcome_events.extend([e.to_ingest() for e in o])
                self.cache.set_source_status(
                    ext.source_id,
                    "ok",
                    f"usage={len(u)} outcomes={len(o)}",
                )
                per_source[ext.source_id] = {
                    "ok": True,
                    "usage": len(u),
                    "outcomes": len(o),
                }
                self.log.info(
                    "%s: %d usage, %d outcomes",
                    ext.source_id,
                    len(u),
                    len(o),
                )
            except Exception as exc:
                self.cache.set_source_status(ext.source_id, "error", str(exc))
                per_source[ext.source_id] = {"ok": False, "error": str(exc)}
                self.log.error("%s failed: %s", ext.source_id, exc)

        self.cache.store_usage_batch(usage_events)
        self.cache.store_outcome_batch(outcome_events)

        result: dict[str, Any] = {
            "ok": True,
            "dryRun": dry_run,
            "sources": per_source,
            "usageExtracted": len(usage_events),
            "outcomesExtracted": len(outcome_events),
            "tenant": {"orgId": tenant.get("orgId"), "name": tenant.get("name")},
        }

        if dry_run:
            return result

        usage_push = {"inserted": 0, "skipped": 0, "errors": []}
        outcome_push = {"inserted": 0, "skipped": 0, "errors": []}

        if usage_events:
            usage_push = self.client.push_usage(usage_events)
            self.cache.clear_usage([e["external_id"] for e in usage_events])
        if outcome_events:
            outcome_push = self.client.push_outcomes(outcome_events)
            self.cache.clear_outcomes([e["external_id"] for e in outcome_events])

        if usage_events or outcome_events:
            self.client.sync_complete(usage_push, outcome_push)

        result["usagePush"] = usage_push
        result["outcomePush"] = outcome_push
        return result

    def status(self) -> dict[str, Any]:
        local = self.cache.source_statuses()
        cloud: dict[str, Any] = {}
        if self.config.outcome_ledger_key:
            try:
                cloud = self.client.ingest_status()
            except Exception as exc:
                cloud = {"error": str(exc)}
        return {"local": local, "cloud": cloud, "pendingUsage": len(self.cache.pending_usage()), "pendingOutcomes": len(self.cache.pending_outcomes())}

    def flush_pending(self) -> dict[str, Any]:
        usage = self.cache.pending_usage()
        outcomes = self.cache.pending_outcomes()
        u = self.client.push_usage(usage) if usage else {"inserted": 0}
        o = self.client.push_outcomes(outcomes) if outcomes else {"inserted": 0}
        if usage:
            self.cache.clear_usage([e["external_id"] for e in usage])
        if outcomes:
            self.cache.clear_outcomes([e["external_id"] for e in outcomes])
        return {"usage": u, "outcomes": o}
