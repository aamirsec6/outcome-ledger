"""Track onboarding events and compute org health scores for the admin panel."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    OnboardingEvent,
    OrgHealthScore,
    Organization,
    OutcomeContract,
    ProviderConnection,
    ReportRun,
    SyncRun,
    TeamMapping,
    UsageEvent,
)

logger = logging.getLogger(__name__)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

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

GITHUB_PROVIDERS = ("github", "github_app")
VENDOR_SOURCES = ("openai", "anthropic", "cursor", "claude-code", "copilot", "csv")
VENDOR_PROVIDERS = ("openai", "anthropic", "cursor", "claude-code", "copilot")


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


def get_furthest_step(db: Session, org_id: str) -> str:
    """Return the furthest onboarding step recorded for an org."""
    rows = (
        db.query(OnboardingEvent.step)
        .filter(OnboardingEvent.org_id == org_id)
        .all()
    )
    if not rows:
        return "signup"
    return max(rows, key=lambda r: STEP_INDEX.get(r[0], 0))[0]


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
    furthest_step = get_furthest_step(db, org_id)
    step_idx = STEP_INDEX.get(furthest_step, 0)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    org_created = _aware(org.created_at if org else now) or now

    first_sync_event = (
        db.query(OnboardingEvent)
        .filter(OnboardingEvent.org_id == org_id, OnboardingEvent.step == "first_sync")
        .order_by(OnboardingEvent.created_at.asc())
        .first()
    )
    first_sync_run = (
        db.query(SyncRun)
        .filter(SyncRun.org_id == org_id)
        .order_by(SyncRun.started_at.asc())
        .first()
    )
    first_cpst_at = None
    if first_sync_event:
        first_cpst_at = first_sync_event.created_at
    elif first_sync_run:
        first_cpst_at = first_sync_run.started_at

    has_dashboard = (
        db.query(OnboardingEvent.id)
        .filter(
            OnboardingEvent.org_id == org_id,
            OnboardingEvent.step == "first_dashboard",
        )
        .first()
        is not None
    )
    first_export = (
        db.query(OnboardingEvent)
        .filter(OnboardingEvent.org_id == org_id, OnboardingEvent.step == "first_export")
        .order_by(OnboardingEvent.created_at.asc())
        .first()
    )
    last_export = (
        db.query(ReportRun)
        .filter(ReportRun.org_id == org_id)
        .order_by(ReportRun.created_at.desc())
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
    cpst_score = 20 if first_cpst_at else 0
    sync_score = min(20, recent_syncs * 4)  # 5+ syncs = full score
    dashboard_score = 15 if has_dashboard else 0
    export_score = 15 if (first_export or last_export) else 0

    total = onboarding_score + cpst_score + sync_score + dashboard_score + export_score

    last_sync_at = _aware(last_sync.started_at) if last_sync else None

    # Retention bucket
    sixty_days_ago = now - timedelta(days=60)
    if last_sync_at and last_sync_at >= thirty_days_ago:
        bucket = "active"
    elif last_sync_at and last_sync_at >= sixty_days_ago:
        bucket = "at_risk"
    elif last_sync_at:
        bucket = "dormant"
    elif org_created >= thirty_days_ago:
        bucket = "new"
    else:
        bucket = "churned"

    # Upsert
    row = db.query(OrgHealthScore).filter(OrgHealthScore.org_id == org_id).first()
    if not row:
        row = OrgHealthScore(org_id=org_id)
        db.add(row)

    row.onboarding_step = furthest_step
    row.onboarding_completed = furthest_step == "first_export"
    row.first_cpst_at = first_cpst_at
    row.last_sync_at = last_sync_at
    row.last_export_at = (
        first_export.created_at
        if first_export
        else (last_export.created_at if last_export else None)
    )
    row.sync_count_30d = recent_syncs
    row.retention_bucket = bucket
    row.health_score = total
    row.updated_at = now

    db.flush()
    return row


def _has_onboarding_event(db: Session, org_id: str, step: str) -> bool:
    return (
        db.query(OnboardingEvent.id)
        .filter(OnboardingEvent.org_id == org_id, OnboardingEvent.step == step)
        .first()
        is not None
    )


def _ensure_onboarding_event(
    db: Session,
    org_id: str,
    step: str,
    *,
    created_at: datetime,
    metadata: dict | None = None,
) -> bool:
    """Insert onboarding step if missing. Returns True when a row was added."""
    if _has_onboarding_event(db, org_id, step):
        return False
    row = OnboardingEvent(
        org_id=org_id,
        step=step,
        metadata_json=json.dumps(metadata) if metadata else None,
        created_at=created_at,
    )
    db.add(row)
    db.flush()
    return True


def backfill_org_analytics(db: Session, org_id: str) -> dict:
    """Infer onboarding + health from existing product data for one org."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return {"orgId": org_id, "error": "org not found", "seeded": []}

    seeded: list[str] = []

    if _ensure_onboarding_event(
        db,
        org_id,
        "signup",
        created_at=org.created_at,
        metadata={"source": "backfill"},
    ):
        seeded.append("signup")

    gh = (
        db.query(ProviderConnection)
        .filter(
            ProviderConnection.org_id == org_id,
            ProviderConnection.provider.in_(GITHUB_PROVIDERS),
        )
        .order_by(ProviderConnection.connected_at.asc())
        .first()
    )
    if gh and _ensure_onboarding_event(
        db,
        org_id,
        "connect_github",
        created_at=gh.connected_at,
        metadata={"provider": gh.provider, "login": gh.external_login, "source": "backfill"},
    ):
        seeded.append("connect_github")

    vendor_at: datetime | None = None
    vendor_meta: dict | None = None
    usage = (
        db.query(UsageEvent)
        .filter(
            UsageEvent.org_id == org_id,
            UsageEvent.source.in_(VENDOR_SOURCES),
        )
        .order_by(UsageEvent.created_at.asc())
        .first()
    )
    if usage:
        vendor_at = usage.created_at
        vendor_meta = {"source": usage.source, "via": "usage_event", "source_type": "backfill"}
    else:
        vendor_conn = (
            db.query(ProviderConnection)
            .filter(
                ProviderConnection.org_id == org_id,
                ProviderConnection.provider.in_(VENDOR_PROVIDERS),
            )
            .order_by(ProviderConnection.connected_at.asc())
            .first()
        )
        if vendor_conn:
            vendor_at = vendor_conn.connected_at
            vendor_meta = {
                "provider": vendor_conn.provider,
                "via": "provider_connection",
                "source_type": "backfill",
            }

    if vendor_at and _ensure_onboarding_event(
        db,
        org_id,
        "connect_vendor",
        created_at=vendor_at,
        metadata=vendor_meta,
    ):
        seeded.append("connect_vendor")

    has_outcome = bool((org.win_definition or "").strip())
    if not has_outcome:
        has_outcome = (
            db.query(OutcomeContract.id)
            .filter(
                OutcomeContract.org_id == org_id,
                OutcomeContract.status.in_(("active", "draft")),
            )
            .first()
            is not None
        )
    if not has_outcome:
        has_outcome = (
            db.query(TeamMapping.id).filter(TeamMapping.org_id == org_id).first() is not None
        )

    if has_outcome and _ensure_onboarding_event(
        db,
        org_id,
        "define_outcome",
        created_at=org.created_at,
        metadata={"source": "backfill"},
    ):
        seeded.append("define_outcome")

    sync = (
        db.query(SyncRun)
        .filter(SyncRun.org_id == org_id)
        .order_by(SyncRun.started_at.asc())
        .first()
    )
    if sync and _ensure_onboarding_event(
        db,
        org_id,
        "first_sync",
        created_at=sync.started_at,
        metadata={"trigger": sync.trigger, "ok": sync.ok, "source": "backfill"},
    ):
        seeded.append("first_sync")

    report = (
        db.query(ReportRun)
        .filter(ReportRun.org_id == org_id)
        .order_by(ReportRun.created_at.asc())
        .first()
    )
    if report and _ensure_onboarding_event(
        db,
        org_id,
        "first_export",
        created_at=report.created_at,
        metadata={"status": report.status, "source": "backfill"},
    ):
        seeded.append("first_export")

    health = _recompute_health_score(db, org_id)
    return {
        "orgId": org_id,
        "orgName": org.name,
        "seeded": seeded,
        "healthScore": health.health_score,
        "retentionBucket": health.retention_bucket,
        "furthestStep": health.onboarding_step,
    }


def backfill_all_analytics(db: Session) -> dict:
    """Backfill onboarding events and health scores for every org."""
    org_ids = [row[0] for row in db.query(Organization.id).all()]
    details = [backfill_org_analytics(db, org_id) for org_id in org_ids]
    return {
        "orgCount": len(org_ids),
        "details": details,
        "seededSteps": sum(len(d.get("seeded") or []) for d in details),
    }
