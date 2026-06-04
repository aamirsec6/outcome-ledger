from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from outcome_ledger_mcp.config import CONFIG_DIR


class EventCache:
    def __init__(self, path: Path | None = None):
        self.path = path or (CONFIG_DIR / "cache.db")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def _init(self) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS pending_usage (
                    external_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS pending_outcomes (
                    external_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS source_sync (
                    source TEXT PRIMARY KEY,
                    last_sync TEXT,
                    status TEXT,
                    detail TEXT
                )
                """
            )

    def store_usage_batch(self, events: list[dict]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            for ev in events:
                conn.execute(
                    "INSERT OR REPLACE INTO pending_usage (external_id, payload, created_at) VALUES (?, ?, ?)",
                    (ev["external_id"], json.dumps(ev), now),
                )

    def store_outcome_batch(self, events: list[dict]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            for ev in events:
                conn.execute(
                    "INSERT OR REPLACE INTO pending_outcomes (external_id, payload, created_at) VALUES (?, ?, ?)",
                    (ev["external_id"], json.dumps(ev), now),
                )

    def pending_usage(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute("SELECT payload FROM pending_usage").fetchall()
        return [json.loads(r[0]) for r in rows]

    def pending_outcomes(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute("SELECT payload FROM pending_outcomes").fetchall()
        return [json.loads(r[0]) for r in rows]

    def clear_usage(self, external_ids: list[str]) -> None:
        if not external_ids:
            return
        with self._conn() as conn:
            conn.executemany(
                "DELETE FROM pending_usage WHERE external_id = ?",
                [(eid,) for eid in external_ids],
            )

    def clear_outcomes(self, external_ids: list[str]) -> None:
        if not external_ids:
            return
        with self._conn() as conn:
            conn.executemany(
                "DELETE FROM pending_outcomes WHERE external_id = ?",
                [(eid,) for eid in external_ids],
            )

    def set_source_status(self, source: str, status: str, detail: str = "") -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO source_sync (source, last_sync, status, detail)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(source) DO UPDATE SET
                    last_sync=excluded.last_sync,
                    status=excluded.status,
                    detail=excluded.detail
                """,
                (source, now, status, detail),
            )

    def source_statuses(self) -> dict[str, dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT source, last_sync, status, detail FROM source_sync"
            ).fetchall()
        return {
            r[0]: {"lastSync": r[1], "status": r[2], "detail": r[3]}
            for r in rows
        }

    def reset(self) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM pending_usage")
            conn.execute("DELETE FROM pending_outcomes")
            conn.execute("DELETE FROM source_sync")
