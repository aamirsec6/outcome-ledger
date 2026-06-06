"""Cursor AI Code Tracking API — per-commit AI vs human line counts."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import CommitAiMetrics
from app.org_credentials import get_cursor_credentials

logger = logging.getLogger(__name__)

CURSOR_API = "https://api.cursor.com"


def _auth_headers(api_key: str) -> dict[str, str]:
    import base64

    token = base64.b64encode(f"{api_key}:".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def _ai_lines_from_record(row: dict) -> tuple[int, int, int]:
    tab = int(row.get("tabLinesAdded") or 0)
    composer = int(row.get("composerLinesAdded") or 0)
    total = int(row.get("totalLinesAdded") or 0)
    non_ai = row.get("nonAiLinesAdded")
    ai = tab + composer
    if total <= 0:
        total = ai + int(non_ai or 0)
    if non_ai is not None:
        human = max(0, int(non_ai))
    else:
        human = max(0, total - ai)
    if total <= 0 and (ai + human) > 0:
        total = ai + human
    return ai, human, total


def probe_cursor_ai_tracking(db: Session, org_id: str) -> dict:
    creds = get_cursor_credentials(db, org_id)
    key = creds.get("api_key") or ""
    if not key:
        return {"ok": False, "error": "Cursor admin API key not configured"}
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=7)
    body = {
        "startDate": int(start.timestamp() * 1000),
        "endDate": int(end.timestamp() * 1000),
        "page": 1,
        "pageSize": 5,
    }
    paths = (
        "/analytics/ai-code/commits",
        "/teams/filtered-usage-events",
    )
    last_err = "unknown"
    with httpx.Client(timeout=30.0) as client:
        for path in paths:
            try:
                resp = client.post(
                    f"{CURSOR_API}{path}",
                    headers={**_auth_headers(key), "Content-Type": "application/json"},
                    json=body,
                )
                if resp.status_code == 404:
                    last_err = f"{path} not available (404)"
                    continue
                if resp.status_code in (401, 403):
                    return {
                        "ok": False,
                        "error": f"Cursor API {resp.status_code} — check Admin API key and plan",
                        "path": path,
                    }
                resp.raise_for_status()
                data = resp.json()
                return {"ok": True, "path": path, "sample": data}
            except httpx.HTTPError as exc:
                last_err = str(exc)
    return {
        "ok": False,
        "error": last_err,
        "hint": "AI Code Tracking requires Cursor Team/Enterprise. Fallback estimators still run.",
    }


def ingest_cursor_commit_metrics(
    db: Session,
    *,
    org_id: str,
    lookback_days: int = 90,
) -> dict:
    creds = get_cursor_credentials(db, org_id)
    key = creds.get("api_key") or ""
    if not key:
        return {"ok": True, "skipped": True, "reason": "no_cursor_api_key", "inserted": 0}

    end = datetime.now(timezone.utc)
    start = end - timedelta(days=lookback_days)
    body = {
        "startDate": int(start.timestamp() * 1000),
        "endDate": int(end.timestamp() * 1000),
        "page": 1,
        "pageSize": 500,
    }
    inserted = 0
    updated = 0

    try:
        with httpx.Client(timeout=120.0) as client:
            page = 1
            while page <= 20:
                body["page"] = page
                resp = client.post(
                    f"{CURSOR_API}/analytics/ai-code/commits",
                    headers={**_auth_headers(key), "Content-Type": "application/json"},
                    json=body,
                )
                if resp.status_code in (401, 403, 404):
                    return {
                        "ok": False,
                        "error": f"Cursor AI tracking API {resp.status_code}",
                        "inserted": inserted,
                    }
                resp.raise_for_status()
                payload = resp.json()
                rows = (
                    payload.get("commits")
                    or payload.get("data")
                    or payload.get("items")
                    or []
                )
                if not rows:
                    break
                for row in rows:
                    commit_hash = (
                        row.get("commitHash")
                        or row.get("commit_hash")
                        or row.get("sha")
                        or ""
                    ).strip().lower()
                    if not commit_hash:
                        continue
                    ai, human, total = _ai_lines_from_record(row)
                    ai_pct = (ai / total * 100) if total > 0 else 0.0
                    existing = (
                        db.query(CommitAiMetrics)
                        .filter(
                            CommitAiMetrics.org_id == org_id,
                            CommitAiMetrics.commit_hash == commit_hash,
                        )
                        .first()
                    )
                    fields = {
                        "repo": row.get("repoName") or row.get("repo"),
                        "ai_lines_added": ai,
                        "human_lines_added": human,
                        "total_lines_added": total,
                        "ai_pct": round(ai_pct, 2),
                        "source": "cursor_api",
                        "confidence": 0.92,
                        "raw_json": json.dumps(row)[:4000],
                    }
                    if existing:
                        for k, v in fields.items():
                            setattr(existing, k, v)
                        updated += 1
                    else:
                        db.add(
                            CommitAiMetrics(
                                org_id=org_id,
                                commit_hash=commit_hash,
                                **fields,
                            )
                        )
                        inserted += 1
                pagination = payload.get("pagination") or {}
                if not pagination.get("hasNextPage", False) and len(rows) < body["pageSize"]:
                    break
                page += 1
        db.flush()
        return {"ok": True, "inserted": inserted, "updated": updated, "source": "cursor_api"}
    except httpx.HTTPError as exc:
        logger.warning("cursor ai ingest failed: %s", exc)
        return {"ok": False, "error": str(exc), "inserted": inserted, "updated": updated}
