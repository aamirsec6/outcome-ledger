#!/usr/bin/env python3
"""Initialize Outcome Ledger DB schema (run once on new Railway Postgres)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import engine, init_db
from app.schema_bootstrap import verify_schema


def main() -> int:
    init_db()
    report = verify_schema(engine)
    print(json.dumps(report, indent=2))
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
