"""AI adoption metrics."""

import json
import uuid
from datetime import datetime, timedelta, timezone

from app.ai_adoption import build_ai_adoption_report
from app.db import SessionLocal, init_db
from app.metrics import ensure_default_org
from app.models import OutcomeEvent, UsageEvent


def setup_module():
    init_db()


def test_ai_adoption_proxy_split():
    db = SessionLocal()
    try:
        org_id = ensure_default_org(db)
        merge_at = datetime.now(timezone.utc) - timedelta(days=14)
        usage_day = merge_at - timedelta(days=1)

        usage = UsageEvent(
            org_id=org_id,
            external_id=f"u-{uuid.uuid4().hex[:8]}",
            source="cursor",
            period_start=usage_day,
            period_end=usage_day,
            cost_usd=20.0,
            user_id="alex@acme.com",
            team_id="eng",
        )
        ai_outcome = OutcomeEvent(
            org_id=org_id,
            external_id=f"o-{uuid.uuid4().hex[:8]}",
            occurred_at=merge_at,
            repo="acme/app",
            team_id="eng",
            accepted=True,
            raw_json=json.dumps({"author": "alex"}),
        )
        human_outcome = OutcomeEvent(
            org_id=org_id,
            external_id=f"o-{uuid.uuid4().hex[:8]}",
            occurred_at=merge_at - timedelta(days=1),
            repo="acme/other",
            team_id="legacy",
            accepted=True,
            raw_json=json.dumps({"author": "bob"}),
        )
        db.add_all([usage, ai_outcome, human_outcome])
        db.flush()

        report = build_ai_adoption_report(db, org_id, lookback_days=90)
        assert report["shippedWork"]["stableOutcomes"] >= 2
        tool_ids = {t["toolId"] for t in report["adoptionByTool"]}
        assert "cursor" in tool_ids
        assert report["aiVsHuman"]["aiAssistedOutcomes"] >= 1
        assert report["aiVsHuman"]["humanOnlyOutcomes"] >= 1
    finally:
        db.rollback()
        db.close()
