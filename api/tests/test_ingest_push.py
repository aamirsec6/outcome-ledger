from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.ingest_push import push_outcome_events, push_usage_events
from app.ingest_schemas import OutcomeEventIn, UsageEventIn
from app.models import Organization, UsageEvent


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    org = Organization(name="Test")
    session.add(org)
    session.flush()
    yield session, org.id
    session.close()


def test_usage_ingest_idempotent(db):
    session, org_id = db
    ev = UsageEventIn(
        external_id="evt-1",
        source="cursor",
        cost_usd=10.0,
        period_start=datetime(2026, 6, 1, tzinfo=timezone.utc),
        period_end=datetime(2026, 6, 1, 23, 59, 59, tzinfo=timezone.utc),
        user_email="dev@co.com",
    )
    r1 = push_usage_events(session, org_id=org_id, events=[ev])
    r2 = push_usage_events(session, org_id=org_id, events=[ev])
    assert r1["inserted"] == 1
    assert r2["skipped"] == 1
    row = session.query(UsageEvent).filter(UsageEvent.org_id == org_id).one()
    assert row.user_id == "dev@co.com"


def test_outcome_ingest(db):
    session, org_id = db
    ev = OutcomeEventIn(
        external_id="github|acme/app|1",
        repo="acme/app",
        pr_number=1,
        author="octo",
        occurred_at=datetime(2026, 6, 4, tzinfo=timezone.utc),
        metadata={"title": "Fix"},
    )
    r = push_outcome_events(session, org_id=org_id, events=[ev])
    assert r["inserted"] == 1
