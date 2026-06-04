from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from outcome_ledger_mcp.extractors.base import BaseExtractor
from outcome_ledger_mcp.extractors.csv_util import find_latest_csv, parse_usage_csv
from outcome_ledger_mcp.models import UsageEvent


class CursorExtractor(BaseExtractor):
    source_id = "cursor"

    def is_configured(self) -> bool:
        return bool(self.config.watch_paths)

    def test_connection(self) -> dict[str, Any]:
        path = find_latest_csv(
            self.config.watch_paths,
            name_patterns=("**/*cursor*.csv", "**/*Cursor*.csv"),
        )
        if path:
            return {"ok": True, "file": str(path)}
        return {
            "ok": False,
            "error": "No Cursor CSV found in watch_paths — export from Cursor admin billing",
        }

    def fetch_usage(self, since: timedelta) -> list[UsageEvent]:
        path = find_latest_csv(
            self.config.watch_paths,
            name_patterns=("**/*cursor*.csv", "**/*Cursor*.csv"),
        )
        if not path:
            return []
        since_dt = datetime.now(timezone.utc) - since
        content = path.read_text(encoding="utf-8-sig")
        return parse_usage_csv(
            content,
            source="cursor",
            since=since_dt,
            user_column="user_email",
        )
