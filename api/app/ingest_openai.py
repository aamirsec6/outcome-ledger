from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import UsageEvent
from app.org_credentials import get_openai_credentials

logger = logging.getLogger(__name__)

SERVICE_ACCOUNT_HINT = (
    "Your key needs the api.usage.read scope (OpenAI → API keys → Edit → Usage read), "
    "plus OPENAI_PROJECT_ID (proj_...). Or use Dashboard → Integrations → OpenAI spend (CSV)."
)


def _openai_headers_from_creds(creds: dict[str, str]) -> dict[str, str]:
    api_key = (creds.get("api_key") or "").strip()
    headers = {"Authorization": f"Bearer {api_key}"}
    org = (creds.get("openai_org_id") or "").strip()
    project = (creds.get("project_id") or "").strip()
    if org:
        headers["OpenAI-Organization"] = org
    if project:
        headers["OpenAI-Project"] = project
    return headers


def probe_openai_access(
    db: Session | None = None, org_id: str | None = None
) -> dict:
    """Check which billing endpoints the current key can reach."""
    if db is not None and org_id:
        creds = get_openai_credentials(db, org_id)
    else:
        creds = {
            "api_key": (os.getenv("OPENAI_API_KEY") or "").strip(),
            "openai_org_id": (os.getenv("OPENAI_ORG_ID") or "").strip(),
            "project_id": (os.getenv("OPENAI_PROJECT_ID") or "").strip(),
        }
    api_key = (creds.get("api_key") or "").strip()
    if not api_key:
        return {"configured": False, "error": "OpenAI API key not set for this workspace"}

    now = int(datetime.now(timezone.utc).timestamp())
    start = now - 7 * 86400
    headers = _openai_headers_from_creds(creds)
    out: dict = {
        "configured": True,
        "hasOrgId": bool((creds.get("openai_org_id") or "").strip()),
        "hasProjectId": bool((creds.get("project_id") or "").strip()),
        "credentialSource": creds.get("source"),
        "costsApi": None,
        "recommendation": None,
    }

    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            "https://api.openai.com/v1/organization/costs",
            headers=headers,
            params={
                "start_time": start,
                "end_time": now,
                "bucket_width": "1d",
                "limit": 1,
                "group_by": "project_id",
            },
        )
        out["costsApi"] = {
            "status": resp.status_code,
            "ok": resp.status_code == 200,
            "detail": resp.text[:300] if resp.status_code >= 400 else "ok",
        }

    if out["costsApi"]["ok"]:
        out["recommendation"] = "Auto-sync via /v1/organization/costs is available."
    elif out["costsApi"]["status"] in (401, 403, 404):
        out["recommendation"] = SERVICE_ACCOUNT_HINT
    else:
        out["recommendation"] = "Unexpected OpenAI response — try CSV import or admin key."

    return out


def ingest_openai_costs(
    db: Session,
    *,
    org_id: str,
    lookback_days: int = 90,
) -> dict:
    creds = get_openai_credentials(db, org_id)
    api_key = (creds.get("api_key") or "").strip()
    if not api_key:
        return {
            "ok": False,
            "error": "OpenAI not configured for this workspace",
            "inserted": 0,
        }

    project_filter = (creds.get("project_id") or "").strip()
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=lookback_days)
    start_ts = int(start.timestamp())
    end_ts = int(now.timestamp())
    headers = _openai_headers_from_creds(creds)

    inserted = 0
    page: str | None = None
    mode = "costs"

    with httpx.Client(timeout=60.0) as client:
        while True:
            params: dict = {
                "start_time": start_ts,
                "end_time": end_ts,
                "bucket_width": "1d",
                "limit": 31,
                "group_by": "project_id",
            }
            if page:
                params["page"] = page

            resp = client.get(
                "https://api.openai.com/v1/organization/costs",
                headers=headers,
                params=params,
            )
            if resp.status_code in (401, 403, 404):
                probe = probe_openai_access(db, org_id)
                return {
                    "ok": False,
                    "error": (
                        f"OpenAI billing API unavailable ({resp.status_code}). "
                        f"{probe.get('recommendation', SERVICE_ACCOUNT_HINT)}"
                    ),
                    "inserted": inserted,
                    "probe": probe,
                }
            if resp.status_code >= 400:
                return {
                    "ok": False,
                    "error": f"OpenAI API error {resp.status_code}: {resp.text[:200]}",
                    "inserted": inserted,
                }
            payload = resp.json()

            for bucket in payload.get("data") or []:
                bucket_start = bucket.get("start_time") or start_ts
                bucket_end = bucket.get("end_time") or end_ts
                period_start = datetime.fromtimestamp(bucket_start, tz=timezone.utc)
                period_end = datetime.fromtimestamp(bucket_end, tz=timezone.utc)

                for row in bucket.get("results") or []:
                    if project_filter:
                        row_project = (row.get("project_id") or "").strip()
                        if row_project and row_project != project_filter:
                            continue

                    amount = row.get("amount") or {}
                    cost = float(amount.get("value") or 0)
                    if cost <= 0:
                        continue
                    line_item = str(row.get("line_item") or "unknown")
                    proj = row.get("project_id") or project_filter or "default"
                    ext = hashlib.sha256(
                        f"openai|{bucket_start}|{proj}|{line_item}|{cost}".encode()
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
    return {
        "ok": True,
        "inserted": inserted,
        "source": "openai",
        "mode": mode,
        "projectFilter": project_filter or None,
    }
