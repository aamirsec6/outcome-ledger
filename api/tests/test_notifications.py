"""Stickiness layer: alerts, inbox, notification settings."""

from __future__ import annotations

from app.db import SessionLocal, init_db
from app.metrics import ensure_default_org
from app.notification_settings import get_notification_settings, update_notification_settings
from app.notifications.content import build_budget_alert
from app.notifications.inbox import build_inbox_summary, count_pending_reviews
from app.notifications.email import render_digest_text
from app.github_webhooks import handle_github_webhook


def setup_module():
    init_db()


def _session():
    return SessionLocal()


def test_notification_settings_roundtrip():
    db = _session()
    org_id = ensure_default_org(db)
    updated = update_notification_settings(
        db,
        org_id,
        {
            "slackWebhookUrl": "https://hooks.slack.com/test",
            "slackAlertsEnabled": True,
            "digestEmails": ["cto@example.com"],
            "digestEnabled": True,
            "monthlyBudgetUsd": 50000,
            "budgetAlertThresholdPct": 75,
            "githubPrCommentsEnabled": True,
        },
    )
    assert updated["slackAlertsEnabled"] is True
    assert updated["digestEmails"] == ["cto@example.com"]
    assert updated["monthlyBudgetUsd"] == 50000

    loaded = get_notification_settings(db, org_id)
    assert loaded["slackWebhookUrl"] == "https://hooks.slack.com/test"
    assert loaded["githubPrCommentsEnabled"] is True
    db.close()


def test_budget_alert_threshold():
    alert = build_budget_alert(
        mtd_spend_usd=85000,
        monthly_budget_usd=100000,
        threshold_pct=80,
    )
    assert alert is not None
    assert alert["severity"] == "medium"
    assert "85" in alert["message"]

    no_alert = build_budget_alert(
        mtd_spend_usd=50000,
        monthly_budget_usd=100000,
        threshold_pct=80,
    )
    assert no_alert is None


def test_inbox_summary_empty():
    db = _session()
    org_id = ensure_default_org(db)
    summary = build_inbox_summary(db, org_id)
    assert summary["pendingCount"] == count_pending_reviews(db, org_id)
    assert "reviewUrl" in summary
    assert "#attribution-inbox" in summary["reviewUrl"]
    db.close()


def test_digest_text_renders():
    db = _session()
    org_id = ensure_default_org(db)
    from app.notifications.content import build_digest_context

    ctx = build_digest_context(db, org_id, lookback_days=90)
    text = render_digest_text(ctx)
    assert "Outcome Ledger weekly digest" in text
    assert "Dashboard:" in text
    db.close()


def test_webhook_replay_protection():
    """Duplicate delivery_id should be skipped."""
    db = _session()
    payload = {"zen": "keep it logically awesome"}
    result1 = handle_github_webhook(db, "ping", payload, delivery_id="deliv-001")
    assert result1.get("pong") is True
    result2 = handle_github_webhook(db, "ping", payload, delivery_id="deliv-001")
    assert result2.get("skipped") == "duplicate delivery"
    db.close()


def test_budget_alert_negative_rejected():
    """Negative budget should raise ValueError, not silently become 0."""
    db = _session()
    org_id = ensure_default_org(db)
    try:
        update_notification_settings(db, org_id, {"monthlyBudgetUsd": -500})
        assert False, "Should have raised ValueError"
    except ValueError as exc:
        assert "non-negative" in str(exc)
    db.close()
