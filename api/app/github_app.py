"""GitHub App — org-level install, installation tokens, repo listing."""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from sqlalchemy.orm import Session

from app.github_oauth import (
    _state_secret,
    github_headers,
    make_oauth_state,
    parse_repos_json,
    verify_oauth_state,
)
from app.models import ProviderConnection

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
PROVIDER = "github_app"


def app_configured() -> bool:
    return bool(
        (os.getenv("GITHUB_APP_ID") or "").strip()
        and _load_private_key()
        and (os.getenv("GITHUB_APP_SLUG") or "").strip()
    )


def _load_private_key() -> str | None:
    path = (os.getenv("GITHUB_APP_PRIVATE_KEY_PATH") or "").strip()
    if path and os.path.isfile(path):
        return open(path, encoding="utf-8").read()
    raw = (os.getenv("GITHUB_APP_PRIVATE_KEY") or "").strip()
    if not raw:
        return None
    return raw.replace("\\n", "\n")


def _app_id() -> str:
    return (os.getenv("GITHUB_APP_ID") or "").strip()


def _app_slug() -> str:
    return (os.getenv("GITHUB_APP_SLUG") or "outcome-ledger").strip()


def _dashboard_url() -> str:
    return (os.getenv("DASHBOARD_URL") or "http://localhost:3001").rstrip("/")


def _callback_url() -> str:
    explicit = (os.getenv("GITHUB_APP_SETUP_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    base = (os.getenv("PUBLIC_API_URL") or "http://127.0.0.1:8090").rstrip("/")
    return f"{base}/v1/connect/github-app/callback"


def make_app_jwt() -> str:
    key = _load_private_key()
    if not key:
        raise RuntimeError("GITHUB_APP_PRIVATE_KEY not configured")
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 9 * 60, "iss": _app_id()}
    return jwt.encode(payload, key, algorithm="RS256")


def get_installation_access_token(installation_id: int) -> str:
    app_jwt = make_app_jwt()
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        data = resp.json()
    token = data.get("token")
    if not token:
        raise RuntimeError("GitHub installation token missing")
    return str(token)


def build_install_url(org_id: str) -> str:
    params = {"state": make_oauth_state(org_id)}
    return f"https://github.com/apps/{_app_slug()}/installations/new?{urlencode(params)}"


def verify_install_state(state: str) -> str | None:
    return verify_oauth_state(state)


def get_app_connection(db: Session, org_id: str) -> ProviderConnection | None:
    return (
        db.query(ProviderConnection)
        .filter(
            ProviderConnection.org_id == org_id,
            ProviderConnection.provider == PROVIDER,
        )
        .first()
    )


def get_connection_by_installation_id(
    db: Session, installation_id: int
) -> ProviderConnection | None:
    rows = (
        db.query(ProviderConnection)
        .filter(ProviderConnection.provider == PROVIDER)
        .all()
    )
    for row in rows:
        cfg = parse_app_config(row.config_json)
        if int(cfg.get("installationId") or 0) == installation_id:
            return row
    return None


def parse_app_config(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def installation_id_from_row(row: ProviderConnection) -> int | None:
    cfg = parse_app_config(row.config_json)
    iid = cfg.get("installationId")
    try:
        return int(iid) if iid is not None else None
    except (TypeError, ValueError):
        return None


def save_app_installation(
    db: Session,
    *,
    org_id: str,
    installation_id: int,
    account_login: str,
    account_type: str,
) -> ProviderConnection:
    now = datetime.now(timezone.utc)
    cfg = {
        "installationId": installation_id,
        "accountLogin": account_login,
        "accountType": account_type,
    }
    row = get_app_connection(db, org_id)
    if row is None:
        row = ProviderConnection(
            org_id=org_id,
            provider=PROVIDER,
            access_token="",
            external_login=account_login,
            scopes="app",
            config_json=json.dumps(cfg),
            connected_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.external_login = account_login
        row.config_json = json.dumps(cfg)
        row.updated_at = now
    db.flush()
    refresh_installation_repos(db, org_id)
    return row


def fetch_installation_repos(installation_id: int, *, limit: int = 200) -> list[str]:
    token = get_installation_access_token(installation_id)
    repos: list[str] = []
    page = 1
    with httpx.Client(timeout=60.0) as client:
        while len(repos) < limit and page <= 10:
            resp = client.get(
                f"{GITHUB_API}/installation/repositories",
                headers=github_headers(token),
                params={"per_page": 100, "page": page},
            )
            resp.raise_for_status()
            data = resp.json()
            batch = data.get("repositories") or []
            if not batch:
                break
            for r in batch:
                name = r.get("full_name")
                if name:
                    repos.append(str(name))
            if len(batch) < 100:
                break
            page += 1
    return repos[:limit]


def refresh_installation_repos(db: Session, org_id: str) -> list[str]:
    row = get_app_connection(db, org_id)
    if row is None:
        return []
    iid = installation_id_from_row(row)
    if not iid:
        return []
    repos = fetch_installation_repos(iid)
    row.repos_json = json.dumps(repos)
    row.updated_at = datetime.now(timezone.utc)
    db.flush()
    return repos


def app_status(db: Session, org_id: str) -> dict[str, Any]:
    row = get_app_connection(db, org_id)
    if row is None:
        return {
            "connected": False,
            "app_configured": app_configured(),
            "mode": None,
        }
    cfg = parse_app_config(row.config_json)
    repos = parse_repos_json(row.repos_json)
    return {
        "connected": True,
        "app_configured": app_configured(),
        "mode": "app",
        "login": row.external_login,
        "accountType": cfg.get("accountType"),
        "installationId": cfg.get("installationId"),
        "repos": repos,
        "repos_count": len(repos),
        "webhooks": True,
        "connected_at": row.connected_at.isoformat() if row.connected_at else None,
    }


def resolve_app_token_and_repos(db: Session, org_id: str) -> tuple[str | None, list[str]]:
    row = get_app_connection(db, org_id)
    if row is None:
        return None, []
    iid = installation_id_from_row(row)
    if not iid:
        return None, []
    repos = parse_repos_json(row.repos_json)
    try:
        token = get_installation_access_token(iid)
        return token, repos
    except Exception:
        logger.exception("Failed to get installation token org=%s", org_id)
        return None, repos


def fetch_installation_account(installation_id: int) -> dict[str, Any]:
    app_jwt = make_app_jwt()
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            f"{GITHUB_API}/app/installations/{installation_id}",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()
