"""GitHub App webhooks — real-time PR merge ingest."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.attribution_engine import rebuild_attribution_graph
from app.github_app import (
    fetch_installation_account,
    get_connection_by_installation_id,
    refresh_installation_repos,
    save_app_installation,
)
from app.ingest_github import _pr_meta
from app.models import OutcomeEvent
from app.notifications.delivery import deliver_post_sync_notifications
from app.notifications.github_comments import post_pr_cost_comments
from app.revert_check import check_reverts
from app.team_mapping import resolve_team_for_repo

logger = logging.getLogger(__name__)


def verify_webhook_signature(body: bytes, signature_header: str | None) -> bool:
    secret = (os.getenv("GITHUB_WEBHOOK_SECRET") or "").strip()
    if not secret:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — rejecting webhook")
        return False
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    received = signature_header[7:]
    return hmac.compare_digest(expected, received)


def upsert_merged_pr_outcome(
    db: Session,
    *,
    org_id: str,
    repo_full_name: str,
    pr: dict,
) -> tuple[OutcomeEvent | None, bool]:
    merged_at = pr.get("merged_at")
    if not merged_at:
        return None, False
    merged_dt = datetime.fromisoformat(merged_at.replace("Z", "+00:00"))
    pr_num = int(pr["number"])
    ext = f"github|{repo_full_name}|{pr_num}"
    meta = _pr_meta(pr, repo_full_name)
    team_id = resolve_team_for_repo(db, org_id, repo_full_name)

    existing = (
        db.query(OutcomeEvent)
        .filter(OutcomeEvent.org_id == org_id, OutcomeEvent.external_id == ext)
        .first()
    )
    if existing:
        existing.title = (pr.get("title") or "")[:512]
        existing.raw_json = json.dumps(meta)
        existing.team_id = team_id
        db.flush()
        return existing, False

    row = OutcomeEvent(
        org_id=org_id,
        external_id=ext,
        outcome_type="pr_merged_stable",
        accepted=True,
        occurred_at=merged_dt,
        team_id=team_id,
        repo=repo_full_name,
        pr_number=pr_num,
        title=(pr.get("title") or "")[:512],
        raw_json=json.dumps(meta),
        reverted=False,
    )
    db.add(row)
    db.flush()
    return row, True


def process_merged_pr_webhook(
    db: Session,
    *,
    org_id: str,
    repo_full_name: str,
    pr: dict,
) -> dict:
    outcome, is_new = upsert_merged_pr_outcome(
        db, org_id=org_id, repo_full_name=repo_full_name, pr=pr
    )
    if outcome is None:
        return {"ok": True, "skipped": "not merged"}

    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    rebuild_attribution_graph(db, org_id, lookback_days=lookback)
    check_reverts(db, org_id)

    new_ids = [outcome.id] if is_new else None
    comments = post_pr_cost_comments(db, org_id, new_outcome_ids=new_ids)
    notifications = deliver_post_sync_notifications(
        db, org_id, new_outcome_ids=new_ids,
    )

    return {
        "ok": True,
        "outcomeId": outcome.id,
        "isNew": is_new,
        "repo": repo_full_name,
        "prNumber": outcome.pr_number,
        "githubComments": comments,
        "notifications": notifications,
    }


# In-memory set of processed GitHub webhook delivery IDs.
# Prevents duplicate processing if GitHub retries a delivery.
_seen_delivery_ids: set[str] = set()
_MAX_SEEN = 5000


def handle_github_webhook(db: Session, event: str, payload: dict, *, delivery_id: str | None = None) -> dict:
    # Replay protection: skip already-processed deliveries.
    if delivery_id:
        if delivery_id in _seen_delivery_ids:
            return {"ok": True, "skipped": "duplicate delivery"}
        _seen_delivery_ids.add(delivery_id)
        # Evict oldest entries if the set grows too large.
        if len(_seen_delivery_ids) > _MAX_SEEN:
            _seen_delivery_ids.clear()
    if event == "ping":
        return {"ok": True, "pong": True}

    if event == "installation":
        action = payload.get("action")
        installation = payload.get("installation") or {}
        installation_id = int(installation.get("id") or 0)
        account = installation.get("account") or {}
        if action == "deleted" and installation_id:
            row = get_connection_by_installation_id(db, installation_id)
            if row:
                db.delete(row)
                db.flush()
            return {"ok": True, "deleted": installation_id}
        return {"ok": True, "skipped": action}

    if event == "installation_repositories":
        installation = payload.get("installation") or {}
        installation_id = int(installation.get("id") or 0)
        row = get_connection_by_installation_id(db, installation_id)
        if row:
            refresh_installation_repos(db, row.org_id)
        return {"ok": True, "refreshed": bool(row)}

    if event == "pull_request":
        action = payload.get("action")
        pr = payload.get("pull_request") or {}
        if action != "closed" or not pr.get("merged"):
            return {"ok": True, "skipped": action or "not merged"}

        installation = payload.get("installation") or {}
        installation_id = int(installation.get("id") or 0)
        if not installation_id:
            return {"ok": False, "error": "missing installation id"}

        row = get_connection_by_installation_id(db, installation_id)
        if row is None:
            account = installation.get("account") or {}
            logger.info(
                "Webhook for unknown installation %s (%s) — link via dashboard",
                installation_id,
                account.get("login"),
            )
            return {"ok": True, "skipped": "installation not linked to org"}

        repo = payload.get("repository") or {}
        repo_full_name = str(repo.get("full_name") or "")
        if not repo_full_name:
            return {"ok": False, "error": "missing repository"}

        return process_merged_pr_webhook(
            db, org_id=row.org_id, repo_full_name=repo_full_name, pr=pr
        )

    return {"ok": True, "ignored": event}


def complete_app_install(
    db: Session,
    *,
    org_id: str,
    installation_id: int,
) -> dict:
    info = fetch_installation_account(installation_id)
    account = info.get("account") or {}
    login = str(account.get("login") or "github")
    account_type = str(account.get("type") or "User")
    save_app_installation(
        db,
        org_id=org_id,
        installation_id=installation_id,
        account_login=login,
        account_type=account_type,
    )
    repos = refresh_installation_repos(db, org_id)
    return {
        "ok": True,
        "installationId": installation_id,
        "login": login,
        "accountType": account_type,
        "repos": repos,
        "repos_count": len(repos),
    }
