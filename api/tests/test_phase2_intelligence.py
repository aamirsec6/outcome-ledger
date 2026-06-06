"""Phase 2: anomalies, network benchmarks, linker training."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.anomalies import detect_cpst_anomalies
from app.attribution_engine import add_manual_override, list_link_candidates, rebuild_attribution_graph
from app.db import SessionLocal, init_db
from app.learned_linker import train_linker_model
from app.metrics import ensure_default_org
from app.models import AttributionLink, OutcomeEvent, UsageEvent
from app.network_benchmarks import network_percentiles, publish_org_benchmark


def setup_module():
    init_db()


def _session():
    return SessionLocal()


def test_ewma_cpst_spike_detection():
    trend = [
        {"week": "2026-W01", "spend": 100, "outcomes": 10},
        {"week": "2026-W02", "spend": 110, "outcomes": 10},
        {"week": "2026-W03", "spend": 400, "outcomes": 10},
    ]
    alerts = detect_cpst_anomalies(trend, spike_threshold_pct=20.0)
    assert any(a["severity"] == "high" for a in alerts)


def test_network_percentiles_k_anon():
    db = _session()
    try:
        for i in range(2):
            publish_org_benchmark(
                db,
                f"org-{i}",
                period="2026-06",
                vertical="engineering_saas",
                cpst_usd=10.0 + i,
                linked_spend_pct=50.0,
                stable_outcomes=5,
            )
        db.commit()
        result = network_percentiles(
            db, vertical="engineering_saas", cpst_usd=12.0, linked_spend_pct=55.0
        )
        assert result["available"] is False
    finally:
        db.rollback()
        db.close()


def test_linker_training_and_candidates():
    db = _session()
    try:
        org_id = ensure_default_org(db)
        merge_at = datetime.now(timezone.utc) - timedelta(days=2)
        usage_day = merge_at - timedelta(hours=6)

        outcome = OutcomeEvent(
            org_id=org_id,
            external_id=f"ol-{uuid.uuid4().hex[:12]}",
            repo="acme/web",
            pr_number=42,
            occurred_at=merge_at,
            title="fix: checkout",
            accepted=True,
        )
        usage = UsageEvent(
            org_id=org_id,
            external_id=f"us-{uuid.uuid4().hex[:12]}",
            source="openai",
            period_start=usage_day,
            period_end=usage_day,
            cost_usd=18.0,
            repo="acme/web",
            pr_number=42,
            trace_id="trace-abc",
        )
        db.add_all([outcome, usage])
        db.flush()

        rebuild_attribution_graph(db, org_id, lookback_days=90)
        link = (
            db.query(AttributionLink)
            .filter(AttributionLink.org_id == org_id)
            .first()
        )
        assert link is not None

        add_manual_override(
            db,
            org_id,
            usage_event_id=usage.id,
            outcome_event_id=outcome.id,
            reason="test override",
        )
        db.commit()

        with patch("app.learned_linker._try_sklearn") as mock_sk:
            mock_sk.return_value = (None, None)
            skipped = train_linker_model(db, org_id)
            assert skipped.get("skipped") is True

        candidates = list_link_candidates(db, org_id, limit=5, max_confidence=1.0)
        assert isinstance(candidates, list)
    finally:
        db.rollback()
        db.close()
