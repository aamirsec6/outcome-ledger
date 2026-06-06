"""Cursor Admin API — auto-ingest daily spend (Team / Enterprise plan)."""

from __future__ import annotations

import hashlib
import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.ingest_cursor_ai import CURSOR_API, _auth_headers
from app.models import UsageEvent
from app.org_credentials import get_cursor_credentials

logger = logging.getLogger(__name__)


def _day_from_ms(ms: int | str | None) -> datetime | None:
    if ms is None:
        return None
    try:
        ts = int(ms) / 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    except (TypeError, ValueError):
        return None


def ingest_cursor_billing(
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
    cost_by_day_user: dict[tuple[str, str], float] = defaultdict(float)

    try:
        with httpx.Client(timeout=120.0) as client:
            page = 1
            while page <= 30:
                body["page"] = page
                resp = client.post(
                    f"{CURSOR_API}/teams/filtered-usage-events",
                    headers={**_auth_headers(key), "Content-Type": "application/json"},
                    json=body,
                )
                if resp.status_code in (401, 403):
                    return {
                        "ok": False,
                        "error": f"Cursor billing API {resp.status_code}",
                        "hint": "Check Admin API key and Team plan",
                        "inserted": 0,
                    }
                if resp.status_code == 404:
                    return {
                        "ok": True,
                        "skipped": True,
                        "reason": "billing_api_not_on_plan",
                        "inserted": 0,
                    }
                resp.raise_for_status()
                payload = resp.json()
                events = payload.get("usageEvents") or payload.get("data") or []
                if not events:
                    break
                for ev in events:
                    day = _day_from_ms(ev.get("timestamp") or ev.get("createdAt"))
                    if not day or day < start:
                        continue
                    email = (ev.get("userEmail") or ev.get("email") or "unknown").strip().lower()
                    cents = float(ev.get("chargedCents") or ev.get("spendCents") or 0)
                    if cents <= 0:
                        continue
                    cost_by_day_user[(day.isoformat(), email)] += cents / 100.0
                pagination = payload.get("pagination") or {}
                if not pagination.get("hasNextPage", False) and len(events) < body["pageSize"]:
                    break
                page += 1

        for (day_iso, email), cost in cost_by_day_user.items():
            if cost <= 0:
                continue
            day = datetime.fromisoformat(day_iso)
            if day.tzinfo is None:
                day = day.replace(tzinfo=timezone.utc)
            ext = hashlib.sha256(
                f"cursor|{day.isoformat()}|{email}|{cost:.4f}".encode()
            ).hexdigest()[:32]
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
                    source="cursor",
                    period_start=day,
                    period_end=period_end,
                    cost_usd=round(cost, 4),
                    user_id=email,
                    team_id="unassigned",
                    raw_json=json.dumps({"source": "cursor_admin_api"}),
                )
            )
            inserted += 1
        db.flush()
        return {"ok": True, "inserted": inserted, "source": "cursor_admin_api"}
    except httpx.HTTPError as exc:
        logger.warning("cursor billing ingest failed: %s", exc)
        return {"ok": False, "error": str(exc), "inserted": inserted}
