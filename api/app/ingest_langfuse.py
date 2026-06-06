"""Langfuse public API ingest — trace metadata + cost (Phase 2)."""

from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import UsageEvent

logger = logging.getLogger(__name__)


def _langfuse_creds() -> dict[str, str]:
    return {
        "public_key": (os.getenv("LANGFUSE_PUBLIC_KEY") or "").strip(),
        "secret_key": (os.getenv("LANGFUSE_SECRET_KEY") or "").strip(),
        "host": (os.getenv("LANGFUSE_BASE_URL") or "https://cloud.langfuse.com").rstrip("/"),
    }


def ingest_langfuse_traces(
    db: Session, *, org_id: str, lookback_days: int = 90
) -> dict:
    creds = _langfuse_creds()
    if not creds["public_key"] or not creds["secret_key"]:
        return {"ok": True, "skipped": True, "reason": "Langfuse keys not configured"}

    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    inserted = 0
    page = 1
    limit = 50

    try:
        with httpx.Client(timeout=60.0) as client:
            while page <= 20:
                res = client.get(
                    f"{creds['host']}/api/public/traces",
                    params={
                        "page": page,
                        "limit": limit,
                        "fromTimestamp": since.isoformat(),
                    },
                    auth=(creds["public_key"], creds["secret_key"]),
                )
                if res.status_code == 401:
                    return {"ok": False, "error": "Langfuse auth failed"}
                if res.status_code != 200:
                    return {"ok": False, "error": f"Langfuse HTTP {res.status_code}"}
                body = res.json()
                traces = body.get("data") or []
                if not traces:
                    break

                for tr in traces:
                    tid = str(tr.get("id") or "")
                    if not tid:
                        continue
                    ts = tr.get("timestamp") or tr.get("createdAt")
                    try:
                        period_start = datetime.fromisoformat(
                            str(ts).replace("Z", "+00:00")
                        )
                    except (TypeError, ValueError):
                        period_start = since
                    metadata = tr.get("metadata") or {}
                    tags = tr.get("tags") or []
                    if isinstance(tags, dict):
                        tags = list(tags.values())
                    repo = (
                        metadata.get("repo")
                        or metadata.get("repository")
                        or _tag_value(tags, "repo:")
                    )
                    pr_raw = metadata.get("pr_number") or metadata.get("pr") or _tag_value(tags, "pr:")
                    pr_number = int(pr_raw) if pr_raw and str(pr_raw).isdigit() else None
                    user_id = metadata.get("user_id") or metadata.get("user") or tr.get("userId")
                    session_id = tr.get("sessionId") or metadata.get("session_id")

                    cost = float(
                        tr.get("totalCost")
                        or tr.get("calculatedTotalCost")
                        or metadata.get("cost_usd")
                        or 0
                    )
                    if cost <= 0:
                        latency_cost = float(tr.get("latency") or 0)
                        if latency_cost > 0:
                            cost = 0.01

                    ext = hashlib.sha256(f"langfuse|{tid}".encode()).hexdigest()[:32]
                    if (
                        db.query(UsageEvent)
                        .filter(UsageEvent.org_id == org_id, UsageEvent.external_id == ext)
                        .first()
                    ):
                        continue

                    db.add(
                        UsageEvent(
                            org_id=org_id,
                            external_id=ext,
                            source="langfuse",
                            period_start=period_start,
                            period_end=period_start,
                            cost_usd=cost,
                            trace_id=tid,
                            session_id=str(session_id) if session_id else None,
                            repo=str(repo) if repo else None,
                            pr_number=pr_number,
                            user_id=str(user_id) if user_id else None,
                            team_id=metadata.get("team_id"),
                        )
                    )
                    inserted += 1

                meta = body.get("meta") or {}
                if page >= int(meta.get("totalPages") or 1):
                    break
                page += 1
    except httpx.HTTPError as exc:
        logger.exception("langfuse ingest failed")
        return {"ok": False, "error": str(exc)}

    db.flush()
    return {"ok": True, "inserted": inserted, "source": "langfuse"}


def _tag_value(tags: list, prefix: str) -> str | None:
    for t in tags:
        s = str(t)
        if s.startswith(prefix):
            return s.split(":", 1)[-1].strip()
    return None
