from __future__ import annotations

import csv
import hashlib
import io
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import UsageEvent


def ingest_usage_csv(
    db: Session,
    *,
    org_id: str,
    content: bytes,
    source: str = "csv",
) -> dict:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    required = {"date", "cost_usd"}
    if not reader.fieldnames or not required.issubset(
        {h.strip().lower() for h in reader.fieldnames}
    ):
        return {
            "ok": False,
            "error": "CSV must include columns: date, cost_usd (optional: source, team_id)",
            "inserted": 0,
        }

    inserted = 0
    for row in reader:
        norm = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
        try:
            day = datetime.strptime(norm["date"][:10], "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            continue
        try:
            cost = float(norm["cost_usd"])
        except ValueError:
            continue
        if cost <= 0:
            continue

        src = norm.get("source") or source
        team = norm.get("team_id") or "unassigned"
        ext = hashlib.sha256(f"{src}|{day.isoformat()}|{team}|{cost}".encode()).hexdigest()[
            :32
        ]

        if (
            db.query(UsageEvent)
            .filter(UsageEvent.org_id == org_id, UsageEvent.external_id == ext)
            .first()
        ):
            continue

        period_end = day.replace(hour=23, minute=59, second=59)
        db.add(
            UsageEvent(
                org_id=org_id,
                external_id=ext,
                source=src,
                period_start=day,
                period_end=period_end,
                cost_usd=cost,
                team_id=team,
            )
        )
        inserted += 1

    db.flush()
    return {"ok": True, "inserted": inserted, "source": source}
