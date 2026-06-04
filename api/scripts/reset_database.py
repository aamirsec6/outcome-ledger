#!/usr/bin/env python3
"""Wipe all Outcome Ledger data (keeps schema). For fresh onboarding."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect, text

from app.db import engine, init_db


# Order: children first; TRUNCATE CASCADE handles FKs on Postgres
_TABLES = [
    "waitlist_page_views",
    "waitlist_signups",
    "outcome_contract_changes",
    "outcome_contract_approvals",
    "cpst_snapshots",
    "report_runs",
    "outcome_contracts",
    "outcome_events",
    "usage_events",
    "sync_runs",
    "team_mappings",
    "provider_connections",
    "organization_api_keys",
    "organization_clerk_links",
    "organizations",
    "schema_migrations",
]


def main() -> int:
    init_db()
    dialect = engine.dialect.name
    existing = set(inspect(engine).get_table_names())
    targets = [t for t in _TABLES if t in existing]

    if not targets:
        print(json.dumps({"ok": False, "error": "no tables found"}))
        return 1

    with engine.begin() as conn:
        if dialect == "postgresql":
            quoted = ", ".join(f'"{t}"' for t in targets)
            conn.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))
        else:
            for table in targets:
                conn.execute(text(f'DELETE FROM "{table}"'))

    print(
        json.dumps(
            {
                "ok": True,
                "dialect": dialect,
                "truncated": targets,
                "message": "Database cleared — sign in again for fresh onboarding",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
