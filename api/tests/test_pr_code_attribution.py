"""PR / commit AI vs human code attribution."""

import json
import uuid
from datetime import datetime, timedelta, timezone

from app.db import SessionLocal, init_db
from app.metrics import ensure_default_org
from app.models import OutcomeEvent, UsageEvent
from app.pr_code_attribution import ai_pct_from_commit_message, rebuild_pr_code_attribution


def setup_module():
    init_db()


def test_git_trailer_parser():
    msg = "fix: auth\n\nCo-authored-by: Cursor <noreply@cursor.com>"
    result = ai_pct_from_commit_message(msg)
    assert result is not None
    assert result[0] == 55.0


def test_spend_correlated_commit_attribution():
    db = SessionLocal()
    try:
        org_id = ensure_default_org(db)
        occurred = datetime.now(timezone.utc) - timedelta(days=14)
        usage = UsageEvent(
            org_id=org_id,
            external_id=f"u-{uuid.uuid4().hex[:8]}",
            source="cursor",
            period_start=occurred - timedelta(days=1),
            period_end=occurred,
            cost_usd=23.0,
            user_id="dev@acme.com",
            team_id="eng",
        )
        outcome = OutcomeEvent(
            org_id=org_id,
            external_id=f"github|acme/app|commit|{'a' * 40}",
            occurred_at=occurred,
            repo="acme/app",
            team_id="eng",
            accepted=True,
            raw_json=json.dumps({"author": "dev", "sha": "a" * 40}),
        )
        db.add_all([usage, outcome])
        db.flush()

        result = rebuild_pr_code_attribution(db, org_id, lookback_days=90)
        assert result["ok"] is True
    finally:
        db.rollback()
        db.close()
