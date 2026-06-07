"""Track onboarding events and compute org health scores for the admin panel."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import OnboardingEvent, OrgHealthScore, Organization, SyncRun

logger = logging.getLogger(__name__)

# Onboarding steps in order
ONBOARDING_STEPS = [
    "signup",
    "connect_github",
    "connect_vendor",
    "define_outcome",
    "first_sync",
    "first_dashboard",
    "first_export",
]

STEP_INDEX = {s: i for i, s in enumerate(ONBOARDING_STEPS)}


def track_onboarding_event(
    db: Session,
    org_id: str,
    step: str,
    *,
    metadata: dict | None = None,
) -> OnboardingEvent:
    """Record that an org completed an onboarding step."""
    row = OnboardingEvent(
        org_id=org_id,
        step=step,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(row)
    db.flush()
    _recompute_health_score(db, org_id)
    return row


def get_latest_step(db: Session, org_id: str) -> str:
    """Return the most recently completed onboarding step for an org."""
    row = (
        db.query(OnboardingEvent)
        .filter(OnboardingEvent.org_id == org_id)
        .order_by(OnboardingEvent.created_at.desc())
        .first()
    )
    return row.step if row else "signup"


def compute_funnel(db: Session) -> list[dict]:
    """Return onboarding funnel: step → count, pct, dropoff."""
    total_orgs = db.query(func.count(Organization.id)).scalar() or 0
    if total_orgs == 0:
        return []

    results = []
    for step in ONBOARDING_STEPS:
        # Count distinct orgs that have completed this step or any later step
        eligible = (
            db.query(func.count(func.distinct(OnboardingEvent.org_id)))
            .filter(OnboardingEvent.step == step)
            .scalar()
            or 0
        )
        pct = round(eligible / total_orgs * 100, 1) if total_orgs > 0 else 0.0
        prev_pct = results[-1]["pct"] if results else 100.0
        dropoff = round(prev_pct - pct, 1) if results else 0.0
        results.append({
            "step": step,
            "count": eligible,
            "pct": pct,
            "dropoffPct": dropoff,
        })
    return results


def compute_retention_buckets(db: Session) -> dict:
    """Return counts per retention bucket."""
    rows = (
        db.query(OrgHealthScore.retention_bucket, func.count(OrgHealthScore.id))
        .group_by(OrgHealthScore.retention_bucket)
        .all()
    )
    buckets = {r[0]: r[1] for r in rows}
    for b in ("active", "at_risk", "dormant", "churned", "new"):
        buckets.setdefault(b, 0)
    return buckets


def list_orgs_by_health(
    db: Session,
    *,
    bucket: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """List orgs with their health scores, optionally filtered by retention bucket."""
    q = db.query(OrgHealthScore, Organization).join(
        Organization, Organization.id == OrgHealthScore.org_id
    )
    if bucket:
        q = q.filter(OrgHealthScore.retention_bucket == bucket)
    q = q.order_by(OrgHealthScore.health_score.desc()).limit(limit).offset(offset)
    results = []
    for health, org in q.all():
        results.append({
            "orgId": org.id,
            "orgName": org.name,
            "onboardingStep": health.onboarding_step,
            "onboardingCompleted": health.onboarding_completed,
            "firstCpstAt": health.first_cpst_at.isoformat() if health.first_cpst_at else None,
            "lastSyncAt": health.last_sync_at.isoformat() if health.last_sync_at else None,
            "lastDashboardViewAt": health.last_dashboard_view_at.isoformat() if health.last_dashboard_view_at else None,
            "syncCount30d": health.sync_count_30d,
            "dashboardViews30d": health.dashboard_views_30d,
            "retentionBucket": health.retention_bucket,
            "healthScore": health.health_score,
            "updatedAt": health.updated_at.isoformat() if health.updated_at else None,
        })
    return results


def get_org_detail(db: Session, org_id: str) -> dict:
    """Full analytics detail for a single org."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return {"error": "org not found"}

    health = (
        db.query(OrgHealthScore).filter(OrgHealthScore.org_id == org_id).first()
    )

    events = (
        db.query(OnboardingEvent)
        .filter(OnboardingEvent.org_id == org_id)
        .order_by(OnboardingEvent.created_at.asc())
        .all()
    )

    return {
        "orgId": org.id,
        "orgName": org.name,
        "createdAt": org.created_at.isoformat() if org.created_at else None,
        "health": {
            "onboardingStep": health.onboarding_step if health else "signup",
            "onboardingCompleted": health.onboarding_completed if health else False,
            "firstCpstAt": health.first_cpst_at.isoformat() if health and health.first_cpst_at else None,
            "lastSyncAt": health.last_sync_at.isoformat() if health and health.last_sync_at else None,
            "syncCount30d": health.sync_count_30d if health else 0,
            "dashboardViews30d": health.dashboard_views_30d if health else 0,
            "retentionBucket": health.retention_bucket if health else "new",
            "healthScore": health.health_score if health else 0,
        },
        "events": [
            {
                "step": e.step,
                "metadata": json.loads(e.metadata_json) if e.metadata_json else None,
                "createdAt": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }


def _recompute_health_score(db: Session, org_id: str) -> OrgHealthScore:
    """Recompute and persist the health score for an org."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Gather raw data
    latest_step = get_latest_step(db, org_id)
    step_idx = STEP_INDEX.get(latest_step, 0)

    first_cpst = (
        db.query(OnboardingEvent)
        .filter(OnboardingEvent.org_id == org_id, OnboardingEvent.step == "first_sync")
        .order_by(OnboardingEvent.created_at.asc())
        .first()
    )

    recent_syncs = (
        db.query(func.count(SyncRun.id))
        .filter(SyncRun.org_id == org_id, SyncRun.started_at >= thirty_days_ago)
        .scalar()
        or 0
    )

    last_sync = (
        db.query(SyncRun)
        .filter(SyncRun.org_id == org_id)
        .order_by(SyncRun.started_at.desc())
        .first()
    )

    # Score components (0-100)
    onboarding_score = min(30, int(step_idx / len(ONBOARDING_STEPS) * 30))
    cpst_score = 20 if first_cpst else 0
    sync_score = min(20, recent_syncs * 4)  # 5+ syncs = full score
    dashboard_score = 15  # placeholder — tracked via dashboard view events
    export_score = 15  # placeholder — tracked via export events

    total = onboarding_score + cpst_score + sync_score + dashboard_score + export_score

    # Retention bucket
    if last_sync and last_sync.started_at >= thirty_days_ago:
        bucket = "active"
    elif last_sync and last_sync.started_at >= now - timedelta(days=60):
        bucket = "at_risk"
    elif last_sync:
        bucket = "dormant"
    else:
        bucket = "churned"

    # Upsert
    row = db.query(OrgHealthScore).filter(OrgHealthScore.org_id == org_id).first()
    if not row:
        row = OrgHealthScore(org_id=org_id)
        db.add(row)

    row.onboarding_step = latest_step
    row.onboarding_completed = latest_step == "first_export"
    row.first_cpst_at = first_cpst.created_at if first_cpst else None
    row.last_sync_at = last_sync.started_at if last_sync else None
    row.sync_count_30d = recent_syncs
    row.retention_bucket = bucket
    row.health_score = total
    row.updated_at = now

    db.flush()
    return row
