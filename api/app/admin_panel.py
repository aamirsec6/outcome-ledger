"""Admin panel API — funnel, retention, org health, onboarding analytics."""

from __future__ import annotations

import os

from fastapi import Depends, FastAPI, Header, HTTPException, Query

from app.analytics import (
    compute_funnel,
    compute_retention_buckets,
    get_org_detail,
    list_orgs_by_health,
    track_onboarding_event,
)
from app.db import get_db
from app.models import Organization

# Separate admin app mounted at /v1/admin
admin_app = FastAPI(title="Outcome Ledger Admin")


def _require_admin_token(
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
) -> None:
    """Simple token auth for the admin panel."""
    expected = (os.getenv("ADMIN_TOKEN") or "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="ADMIN_TOKEN not configured")
    if not x_admin_token or x_admin_token.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid admin token")


def admin_dep():
    """Dependency shorthand."""
    return Depends(_require_admin_token)


@admin_app.get("/v1/admin/funnel")
def admin_funnel(_=admin_dep()):
    """Onboarding funnel: step → count, pct, dropoff."""
    with get_db() as db:
        return {
            "funnel": compute_funnel(db),
            "generated_at": __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat(),
        }


@admin_app.get("/v1/admin/retention")
def admin_retention(_=admin_dep()):
    """Retention bucket distribution."""
    with get_db() as db:
        buckets = compute_retention_buckets(db)
        return {"buckets": buckets}


@admin_app.get("/v1/admin/orgs")
def admin_list_orgs(
    bucket: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    _=admin_dep(),
):
    """List orgs with health scores, filterable by retention bucket."""
    with get_db() as db:
        orgs = list_orgs_by_health(db, bucket=bucket, limit=limit, offset=offset)
        total = db.query(func.count(Organization.id)).scalar() or 0
        return {"orgs": orgs, "total": total, "limit": limit, "offset": offset}


@admin_app.get("/v1/admin/orgs/{org_id}")
def admin_org_detail(org_id: str, _=admin_dep()):
    """Full analytics detail for a single org."""
    with get_db() as db:
        detail = get_org_detail(db, org_id)
        if "error" in detail:
            raise HTTPException(status_code=404, detail=detail["error"])
        return detail


@admin_app.post("/v1/admin/track/{org_id}/{step}")
def admin_track_event(
    org_id: str,
    step: str,
    metadata: dict | None = None,
    _=admin_dep(),
):
    """Manually track an onboarding event (for testing or backfill)."""
    with get_db() as db:
        row = track_onboarding_event(db, org_id, step, metadata=metadata)
        return {"ok": True, "id": row.id, "step": step}


from sqlalchemy import func  # noqa: E402 — placed here to avoid circular at module level


def mount_admin(app):
    """Mount the admin sub-app onto the main FastAPI app."""
    app.mount("/admin", admin_app)
