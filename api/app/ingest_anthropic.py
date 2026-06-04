from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import UsageEvent
from app.org_credentials import get_anthropic_credentials

logger = logging.getLogger(__name__)

ANTHROPIC_API = "https://api.anthropic.com/v1/organizations/cost_report"


def ingest_anthropic_costs(
    db: Session,
    *,
    org_id: str,
    lookback_days: int = 90,
) -> dict:
    creds = get_anthropic_credentials(db, org_id)
    api_key = (creds.get("api_key") or "").strip()
    if not api_key:
        return {
            "ok": False,
            "error": "Anthropic not configured for this workspace",
            "inserted": 0,
        }

    if not api_key.startswith("sk-ant-admin"):
        return {
            "ok": False,
            "error": "ANTHROPIC_ADMIN_API_KEY must be an Admin key (sk-ant-admin...)",
            "inserted": 0,
        }

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=lookback_days)
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

    inserted = 0
    chunk_start = start

    with httpx.Client(timeout=60.0) as client:
        while chunk_start < now:
            chunk_end = min(chunk_start + timedelta(days=31), now)
            page: str | None = None

            while True:
                params: dict = {
                    "starting_at": chunk_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "ending_at": chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "bucket_width": "1d",
                    "limit": 31,
                }
                if page:
                    params["page"] = page

                resp = client.get(ANTHROPIC_API, headers=headers, params=params)
                if resp.status_code == 401:
                    return {
                        "ok": False,
                        "error": "Anthropic Admin API unauthorized",
                        "inserted": inserted,
                    }
                resp.raise_for_status()
                payload = resp.json()

                for bucket in payload.get("data") or []:
                    starting_at = bucket.get("starting_at") or chunk_start.isoformat()
                    try:
                        period_start = datetime.fromisoformat(
                            starting_at.replace("Z", "+00:00")
                        )
                    except ValueError:
                        period_start = chunk_start
                    period_end = period_start + timedelta(days=1)

                    bucket_cents = 0.0
                    models: list[str] = []
                    for row in bucket.get("results") or []:
                        raw = row.get("amount") or 0
                        try:
                            bucket_cents += float(raw)
                        except (TypeError, ValueError):
                            continue
                        model = row.get("model")
                        if model:
                            models.append(str(model))

                    cost_usd = bucket_cents / 100.0
                    if cost_usd <= 0:
                        continue

                    day_key = period_start.strftime("%Y-%m-%d")
                    model_label = models[0] if models else "anthropic"
                    ext = hashlib.sha256(
                        f"anthropic|{day_key}|{cost_usd:.4f}".encode()
                    ).hexdigest()[:32]

                    if (
                        db.query(UsageEvent)
                        .filter(
                            UsageEvent.org_id == org_id,
                            UsageEvent.external_id == ext,
                        )
                        .first()
                    ):
                        continue

                    db.add(
                        UsageEvent(
                            org_id=org_id,
                            external_id=ext,
                            source="anthropic",
                            period_start=period_start,
                            period_end=period_end,
                            cost_usd=cost_usd,
                            model=model_label,
                            team_id="unassigned",
                        )
                    )
                    inserted += 1

                if not payload.get("has_more"):
                    break
                page = payload.get("next_page")
                if not page:
                    break

            chunk_start = chunk_end

    db.flush()
    return {"ok": True, "inserted": inserted, "source": "anthropic"}
