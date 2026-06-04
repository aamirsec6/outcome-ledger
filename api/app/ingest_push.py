from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ingest_schemas import (
    MAX_INGEST_BATCH,
    OutcomeEventIn,
    UsageEventIn,
)
from app.models import OutcomeEvent, SyncRun, UsageEvent
from app.sync_audit import finish_sync_run, last_sync_run, start_sync_run
from app.team_mapping import resolve_team_for_repo


def push_usage_events(
    db: Session,
    *,
    org_id: str,
    events: list[UsageEventIn],
) -> dict:
    inserted = 0
    skipped = 0
    errors: list[dict] = []

    for idx, ev in enumerate(events):
        try:
            ext = ev.resolved_external_id()
        except ValueError as exc:
            errors.append({"index": idx, "error": str(exc)})
            continue

        existing = (
            db.query(UsageEvent)
            .filter(UsageEvent.org_id == org_id, UsageEvent.external_id == ext)
            .first()
        )
        if existing:
            skipped += 1
            continue

        raw = json.dumps(ev.metadata) if ev.metadata else None
        db.add(
            UsageEvent(
                org_id=org_id,
                external_id=ext,
                source=ev.source.strip()[:32],
                period_start=ev.period_start,
                period_end=ev.period_end,
                cost_usd=float(ev.cost_usd),
                input_tokens=int(ev.input_tokens),
                output_tokens=int(ev.output_tokens),
                model=(ev.model or "")[:64] or None,
                team_id=(ev.team_id or "unassigned")[:64],
                user_id=ev.resolved_user_id(),
                repo=(ev.repo or "")[:256] or None,
                raw_json=raw,
            )
        )
        inserted += 1

    db.flush()
    return {"inserted": inserted, "skipped": skipped, "errors": errors}


def push_outcome_events(
    db: Session,
    *,
    org_id: str,
    events: list[OutcomeEventIn],
) -> dict:
    inserted = 0
    skipped = 0
    updated = 0
    errors: list[dict] = []

    for idx, ev in enumerate(events):
        try:
            ext = ev.resolved_external_id()
        except ValueError as exc:
            errors.append({"index": idx, "error": str(exc)})
            continue

        team_id = ev.team_id or resolve_team_for_repo(db, org_id, ev.repo)
        meta = dict(ev.metadata or {})
        if ev.author:
            meta.setdefault("author", ev.author)
        title = (meta.get("title") or "")[:512] or None
        reverted = bool(meta.get("reverted", False))
        raw_json = json.dumps(meta) if meta else None

        existing = (
            db.query(OutcomeEvent)
            .filter(OutcomeEvent.org_id == org_id, OutcomeEvent.external_id == ext)
            .first()
        )
        if existing:
            existing.outcome_type = ev.outcome_type[:64]
            existing.accepted = ev.accepted
            existing.occurred_at = ev.occurred_at
            existing.team_id = team_id
            existing.repo = ev.repo[:256]
            existing.pr_number = ev.pr_number
            existing.title = title
            existing.raw_json = raw_json
            existing.reverted = reverted
            updated += 1
            skipped += 1
            continue

        db.add(
            OutcomeEvent(
                org_id=org_id,
                external_id=ext,
                outcome_type=ev.outcome_type[:64],
                accepted=ev.accepted,
                occurred_at=ev.occurred_at,
                team_id=team_id,
                repo=ev.repo[:256],
                pr_number=ev.pr_number,
                title=title,
                raw_json=raw_json,
                reverted=reverted,
            )
        )
        inserted += 1

    db.flush()
    return {"inserted": inserted, "skipped": skipped, "updated": updated, "errors": errors}


def record_mcp_sync(
    db: Session,
    org_id: str,
    *,
    usage_result: dict,
    outcome_result: dict,
) -> str:
    run = start_sync_run(db, org_id, "mcp_agent")
    results = {
        "ok": True,
        "trigger": "mcp_agent",
        "usage": usage_result,
        "outcomes": outcome_result,
    }
    finish_sync_run(db, run, results)
    return run.id


def build_ingest_status(db: Session, org_id: str) -> dict:
    usage_by_source = (
        db.query(UsageEvent.source, func.count())
        .filter(UsageEvent.org_id == org_id)
        .group_by(UsageEvent.source)
        .all()
    )
    outcome_total = (
        db.query(func.count())
        .filter(OutcomeEvent.org_id == org_id)
        .scalar()
        or 0
    )
    usage_total = sum(c for _, c in usage_by_source)

    last_mcp = (
        db.query(SyncRun)
        .filter(SyncRun.org_id == org_id, SyncRun.trigger == "mcp_agent")
        .order_by(SyncRun.started_at.desc())
        .first()
    )
    last_any = last_sync_run(db, org_id)

    sources: dict[str, dict] = {}
    for src, count in usage_by_source:
        sources[src] = {
            "usageEvents": int(count),
            "status": "ok",
        }

    mcp_results = None
    if last_mcp and last_mcp.results_json:
        try:
            mcp_results = json.loads(last_mcp.results_json)
        except json.JSONDecodeError:
            pass

    return {
        "orgId": org_id,
        "lastSync": (
            last_mcp.finished_at.isoformat()
            if last_mcp and last_mcp.finished_at
            else (
                last_any.finished_at.isoformat()
                if last_any and last_any.finished_at
                else None
            )
        ),
        "lastMcpSync": (
            last_mcp.finished_at.isoformat()
            if last_mcp and last_mcp.finished_at
            else None
        ),
        "usageEventsTotal": int(usage_total),
        "outcomeEventsTotal": int(outcome_total),
        "sources": sources,
        "lastMcpResults": mcp_results,
    }


def validate_batch_size(count: int) -> None:
    if count > MAX_INGEST_BATCH:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=413,
            detail=f"Maximum {MAX_INGEST_BATCH} events per request",
        )
