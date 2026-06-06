"""GitHub App — webhook signature and install config."""

from __future__ import annotations

import hashlib
import hmac
import json
import os

from app.db import SessionLocal, init_db
from app.github_app import app_configured, parse_app_config, save_app_installation
from app.github_webhooks import handle_github_webhook, verify_webhook_signature
from app.metrics import ensure_default_org


def setup_module():
    init_db()


def _session():
    return SessionLocal()


def test_webhook_signature_roundtrip(monkeypatch):
    secret = "test-webhook-secret"
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", secret)
    body = b'{"zen":"ping"}'
    sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_webhook_signature(body, sig) is True
    assert verify_webhook_signature(body, "sha256=bad") is False


def test_app_configured_false_without_env(monkeypatch):
    monkeypatch.delenv("GITHUB_APP_ID", raising=False)
    monkeypatch.delenv("GITHUB_APP_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("GITHUB_APP_SLUG", raising=False)
    assert app_configured() is False


def test_save_app_installation(monkeypatch):
    monkeypatch.setattr(
        "app.github_app.fetch_installation_repos",
        lambda *a, **k: ["test-org/repo-a"],
    )
    db = _session()
    org_id = ensure_default_org(db)
    save_app_installation(
        db,
        org_id=org_id,
        installation_id=99901,
        account_login="test-org",
        account_type="Organization",
    )
    from app.github_app import get_app_connection, installation_id_from_row

    row = get_app_connection(db, org_id)
    assert row is not None
    assert installation_id_from_row(row) == 99901
    db.close()


def test_webhook_ping():
    db = _session()
    result = handle_github_webhook(db, "ping", {"zen": "pong"})
    assert result.get("pong") is True
    db.close()


def test_webhook_ignores_unmerged_pr():
    db = _session()
    payload = {
        "action": "closed",
        "pull_request": {"merged": False, "number": 1},
        "installation": {"id": 1},
        "repository": {"full_name": "org/repo"},
    }
    result = handle_github_webhook(db, "pull_request", payload)
    assert result.get("skipped")
    db.close()


def test_parse_app_config():
    assert parse_app_config('{"installationId": 42}')["installationId"] == 42
    assert parse_app_config("") == {}
