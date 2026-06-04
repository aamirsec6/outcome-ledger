from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import UsageEvent

logger = logging.getLogger(__name__)


def ingest_openai_costs(
    db: Session,
    *,
    org_id: str,
    lookback_days: int = 90,
) -> dict:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return {"ok": False, "error": "OPENAI_API_KEY not set", "inserted": 0}

    org_header = (os.getenv("OPENAI_ORG_ID") or "").strip()
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=lookback_days)
    start_ts = int(start.timestamp())
    end_ts = int(now.timestamp())

    headers = {"Authorization": f"Bearer {api_key}"}
    if org_header:
        headers["OpenAI-Organization"] = org_header

    inserted = 0
    page: str | None = None

    with httpx.Client(timeout=60.0) as client:
        while True:
            params: dict = {
                "start_time": start_ts,
                "end_time": end_ts,
                "bucket_width": "1d",
                "limit": 31,
            }
            if page:
                params["page"] = page

            resp = client.get(
                "https://api.openai.com/v1/organization/costs",
                headers=headers,
                params=params,
            )
            if resp.status_code == 404:
                return {
                    "ok": False,
                    "error": "OpenAI /organization/costs returned 404 — need org admin key",
                    "inserted": inserted,
                }
            resp.raise_for_status()
            payload = resp.json()

            for bucket in payload.get("data") or []:
                bucket_start = bucket.get("start_time") or start_ts
                bucket_end = bucket.get("end_time") or end_ts
                period_start = datetime.fromtimestamp(bucket_start, tz=timezone.utc)
                period_end = datetime.fromtimestamp(bucket_end, tz=timezone.utc)

                for row in bucket.get("results") or []:
                    amount = row.get("amount") or {}
                    cost = float(amount.get("value") or 0)
                    if cost <= 0:
                        continue
                    line_item = str(row.get("line_item") or "unknown")
                    ext = hashlib.sha256(
                        f"openai|{bucket_start}|{line_item}|{cost}".encode()
                    ).hexdigest()[:32]

                    existing = (
                        db.query(UsageEvent)
                        .filter(
                            UsageEvent.org_id == org_id,
                            UsageEvent.external_id == ext,
                        )
                        .first()
                    )
                    if existing:
                        continue

                    db.add(
                        UsageEvent(
                            org_id=org_id,
                            external_id=ext,
                            source="openai",
                            period_start=period_start,
                            period_end=period_end,
                            cost_usd=cost,
                            model=line_item,
                            team_id="unassigned",
                        )
                    )
                    inserted += 1

            if not payload.get("has_more"):
                break
            page = payload.get("next_page")
            if not page:
                break

    db.flush()
    return {"ok": True, "inserted": inserted, "source": "openai"}
