"""Admin analytics backfill from existing product tables."""

from __future__ import annotations

from datetime import datetime, timezone

from app.analytics import backfill_org_analytics
from app.db import SessionLocal, init_db
from app.models import Organization, ProviderConnection, SyncRun, UsageEvent


def setup_module():
    init_db()


def _session():
    return SessionLocal()


def test_backfill_seeds_signup_sync_and_health():
    db = _session()
    org = Organization(name="Backfill Test Org")
    db.add(org)
    db.flush()
    org_id = org.id

    db.add(
        SyncRun(
            org_id=org_id,
            trigger="manual",
            ok=True,
            started_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        )
    )
    db.add(
        UsageEvent(
            org_id=org_id,
            external_id="usage-test-1",
            source="cursor",
            period_start=datetime(2026, 5, 1, tzinfo=timezone.utc),
            period_end=datetime(2026, 5, 2, tzinfo=timezone.utc),
            cost_usd=12.5,
        )
    )
    db.add(
        ProviderConnection(
            org_id=org_id,
            provider="github",
            access_token="test-token",
            connected_at=datetime(2026, 5, 15, tzinfo=timezone.utc),
        )
    )
    db.commit()

    result = backfill_org_analytics(db, org_id)
    db.commit()

    assert "signup" in result["seeded"]
    assert "connect_github" in result["seeded"]
    assert "connect_vendor" in result["seeded"]
    assert "first_sync" in result["seeded"]
    assert result["healthScore"] > 0
    assert result["furthestStep"] in ("first_sync", "connect_vendor", "connect_github")

    again = backfill_org_analytics(db, org_id)
    assert again["seeded"] == []
