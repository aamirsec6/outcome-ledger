from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.extractors.csv_util import find_latest_csv, parse_usage_csv
from outcome_ledger_mcp.models import UsageEvent


class ClaudeCodeExtractor(BaseExtractor):
    source_id = "claude_code"

    def is_configured(self) -> bool:
        return bool(self.config.watch_paths or self.config.anthropic_api_key)

    def test_connection(self) -> dict[str, Any]:
        path = find_latest_csv(
            self.config.watch_paths,
            name_patterns=(
                "**/*claude*.csv",
                "**/*Claude*.csv",
                "**/*claude-code*.csv",
            ),
        )
        if path:
            return {"ok": True, "file": str(path)}
        if self.config.anthropic_api_key:
            return {
                "ok": True,
                "note": "No local CSV; anthropic org costs ingested via anthropic extractor",
            }
        return {"ok": False, "error": "No Claude Code CSV in watch_paths"}

    def fetch_usage(self, since: timedelta) -> list[UsageEvent]:
        path = find_latest_csv(
            self.config.watch_paths,
            name_patterns=(
                "**/*claude*.csv",
                "**/*Claude*.csv",
                "**/*claude-code*.csv",
            ),
        )
        if not path:
            return []
        since_dt = datetime.now(timezone.utc) - since
        content = path.read_text(encoding="utf-8-sig")
        return parse_usage_csv(
            content,
            source="claude_code",
            since=since_dt,
            user_column="engineer_id",
        )
