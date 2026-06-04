from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import SyncRun


def start_sync_run(db: Session, org_id: str, trigger: str) -> SyncRun:
    row = SyncRun(org_id=org_id, trigger=trigger, ok=True, started_at=datetime.now(timezone.utc))
    db.add(row)
    db.flush()
    return row


def finish_sync_run(db: Session, row: SyncRun, results: dict) -> None:
    row.results_json = json.dumps(results)
    row.ok = bool(results.get("ok", True))
    row.finished_at = datetime.now(timezone.utc)


def last_sync_run(db: Session, org_id: str) -> SyncRun | None:
    return (
        db.query(SyncRun)
        .filter(SyncRun.org_id == org_id)
        .order_by(SyncRun.started_at.desc())
        .first()
    )


def sync_history(db: Session, org_id: str, limit: int = 20) -> list[dict]:
    rows = (
        db.query(SyncRun)
        .filter(SyncRun.org_id == org_id)
        .order_by(SyncRun.started_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in rows:
        out.append(
            {
                "id": r.id,
                "trigger": r.trigger,
                "ok": r.ok,
                "startedAt": r.started_at.isoformat() if r.started_at else None,
                "finishedAt": r.finished_at.isoformat() if r.finished_at else None,
                "results": json.loads(r.results_json) if r.results_json else None,
            }
        )
    return out
