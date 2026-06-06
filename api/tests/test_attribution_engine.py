"""Tests for proportional attribution graph."""

import uuid
from datetime import datetime, timedelta, timezone

from app.attribution_engine import rebuild_attribution_graph, summary_from_persisted_links
from app.db import Base, SessionLocal, engine, init_db
from app.metrics import ensure_default_org
from app.models import OutcomeEvent, UsageEvent
from app.workflow_classifier import classify_workflow


def setup_module():
    init_db()


def _session():
    return SessionLocal()


def test_classify_workflow_bugfix():
    assert classify_workflow(title="fix: login redirect", labels=[]) == "bugfix"
    assert classify_workflow(title="feat: add CPST chart", labels=[]) == "feature"


def test_proportional_link_orphan_csv():
    db = _session()
    try:
        org_id = ensure_default_org(db)
        merge_at = datetime.now(timezone.utc) - timedelta(days=3)
        usage_day = merge_at - timedelta(days=1)

        ext = f"test-pr-{uuid.uuid4().hex[:12]}"
        outcome = OutcomeEvent(
            org_id=org_id,
            external_id=ext,
            repo="acme/api",
            occurred_at=merge_at,
            title="fix: auth",
            accepted=True,
        )
        db.add(outcome)
        db.flush()

        usage = UsageEvent(
            org_id=org_id,
            external_id=f"test-csv-{uuid.uuid4().hex[:12]}",
            source="csv",
            period_start=usage_day,
            period_end=usage_day,
            cost_usd=24.0,
            team_id="platform",
        )
        db.add(usage)
        db.commit()

        result = rebuild_attribution_graph(db, org_id, lookback_days=90)
        assert result["ok"] is True
        assert result["created"] >= 1

        summary = summary_from_persisted_links(db, org_id, lookback_days=90)
        assert summary["outcomeLinkedSpendPct"] > 0
        assert summary["linkedSpendUsd"] > 0
        assert summary["engine"] == "persisted_v2"
    finally:
        db.rollback()
        db.close()


def test_classify_infra_from_path():
    assert (
        classify_workflow(
            title="update config",
            changed_paths=[".github/workflows/deploy.yml"],
        )
        == "infra"
    )
