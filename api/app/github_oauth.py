from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.models import ProviderConnection

logger = logging.getLogger(__name__)

GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN = "https://github.com/login/oauth/access_token"
GITHUB_API = "https://api.github.com"
DEFAULT_SCOPES = "repo read:user read:org"


def _oauth_configured() -> bool:
    return bool(
        (os.getenv("GITHUB_OAUTH_CLIENT_ID") or "").strip()
        and (os.getenv("GITHUB_OAUTH_CLIENT_SECRET") or "").strip()
    )


def _callback_url() -> str:
    explicit = (os.getenv("GITHUB_OAUTH_CALLBACK_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    base = (os.getenv("PUBLIC_API_URL") or "http://127.0.0.1:8090").rstrip("/")
    return f"{base}/v1/connect/github/callback"


def _dashboard_url() -> str:
    return (
        os.getenv("DASHBOARD_URL") or "http://localhost:3001"
    ).rstrip("/")


def _state_secret() -> str:
    return (
        os.getenv("OUTCOME_LEDGER_API_KEY")
        or os.getenv("GITHUB_OAUTH_CLIENT_SECRET")
        or "dev-state-secret"
    )


def make_oauth_state(org_id: str) -> str:
    nonce = secrets.token_hex(8)
    payload = f"{org_id}:{nonce}"
    sig = hmac.new(
        _state_secret().encode(), payload.encode(), hashlib.sha256
    ).hexdigest()[:16]
    return f"{payload}:{sig}"


def verify_oauth_state(state: str) -> str | None:
    parts = (state or "").split(":")
    if len(parts) != 3:
        return None
    org_id, nonce, sig = parts
    payload = f"{org_id}:{nonce}"
    expected = hmac.new(
        _state_secret().encode(), payload.encode(), hashlib.sha256
    ).hexdigest()[:16]
    if not hmac.compare_digest(expected, sig):
        return None
    return org_id


def build_authorize_url(org_id: str) -> str:
    client_id = os.getenv("GITHUB_OAUTH_CLIENT_ID", "").strip()
    params = {
        "client_id": client_id,
        "redirect_uri": _callback_url(),
        "scope": DEFAULT_SCOPES,
        "state": make_oauth_state(org_id),
    }
    return f"{GITHUB_AUTHORIZE}?{urlencode(params)}"


def exchange_code(code: str) -> dict[str, Any]:
    client_id = os.getenv("GITHUB_OAUTH_CLIENT_ID", "").strip()
    client_secret = os.getenv("GITHUB_OAUTH_CLIENT_SECRET", "").strip()
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            GITHUB_TOKEN,
            headers={"Accept": "application/json"},
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": _callback_url(),
            },
        )
        resp.raise_for_status()
        return resp.json()


def github_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def fetch_github_user(token: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(f"{GITHUB_API}/user", headers=github_headers(token))
        resp.raise_for_status()
        return resp.json()


def fetch_accessible_repos(token: str, *, limit: int = 200) -> list[dict[str, Any]]:
    """List repos the OAuth token can read (GitHub may omit newly created repos until re-auth)."""
    repos: list[dict[str, Any]] = []
    seen: set[str] = set()
    page = 1
    with httpx.Client(timeout=60.0) as client:
        while len(repos) < limit and page <= 10:
            resp = client.get(
                f"{GITHUB_API}/user/repos",
                headers=github_headers(token),
                params={
                    "affiliation": "owner,collaborator,organization_member",
                    "sort": "pushed",
                    "direction": "desc",
                    "per_page": 100,
                    "page": page,
                },
            )
            resp.raise_for_status()
            batch = resp.json()
            if not batch:
                break
            for r in batch:
                name = r.get("full_name")
                if not name or name in seen:
                    continue
                seen.add(name)
                repos.append(
                    {
                        "full_name": name,
                        "private": r.get("private"),
                        "updated_at": r.get("updated_at") or r.get("pushed_at"),
                    }
                )
            if len(batch) < 100:
                break
            page += 1
    return repos[:limit]


def verify_repo_access(token: str, full_name: str) -> dict[str, Any]:
    """Check token can read owner/repo (works when user adds a repo not yet in /user/repos)."""
    full_name = full_name.strip()
    if "/" not in full_name:
        raise ValueError("Use owner/repo format, e.g. aamirsec6/outcome-ledger")
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            f"{GITHUB_API}/repos/{full_name}",
            headers=github_headers(token),
        )
        if resp.status_code == 404:
            raise ValueError(
                f"Cannot access {full_name}. Re-connect GitHub and grant this repo, "
                "or check the name."
            )
        resp.raise_for_status()
        r = resp.json()
        return {
            "full_name": r.get("full_name"),
            "private": r.get("private"),
            "updated_at": r.get("updated_at") or r.get("pushed_at"),
        }


def merge_repo_lists(
    listed: list[dict[str, Any]], extra_full_names: list[str]
) -> list[dict[str, Any]]:
    by_name = {r["full_name"]: r for r in listed if r.get("full_name")}
    for name in extra_full_names:
        if name and name not in by_name:
            by_name[name] = {"full_name": name, "private": None, "updated_at": None}
    return sorted(by_name.values(), key=lambda x: (x.get("full_name") or "").lower())


def get_github_connection(db: Session, org_id: str) -> ProviderConnection | None:
    return (
        db.query(ProviderConnection)
        .filter(
            ProviderConnection.org_id == org_id,
            ProviderConnection.provider == "github",
        )
        .first()
    )


def parse_repos_json(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x).strip() for x in data if str(x).strip()]
    except json.JSONDecodeError:
        pass
    return [r.strip() for r in raw.split(",") if r.strip()]


def save_github_connection(
    db: Session,
    *,
    org_id: str,
    access_token: str,
    login: str,
    scopes: str,
) -> ProviderConnection:
    now = datetime.now(timezone.utc)
    row = get_github_connection(db, org_id)
    if row is None:
        row = ProviderConnection(
            org_id=org_id,
            provider="github",
            access_token=access_token,
            external_login=login,
            scopes=scopes,
            connected_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.access_token = access_token
        row.external_login = login
        row.scopes = scopes
        row.updated_at = now
    db.flush()
    return row


def github_status(db: Session, org_id: str) -> dict[str, Any]:
    row = get_github_connection(db, org_id)
    if row is None:
        return {"connected": False, "oauth_configured": _oauth_configured()}
    repos = parse_repos_json(row.repos_json)
    return {
        "connected": True,
        "oauth_configured": _oauth_configured(),
        "login": row.external_login,
        "repos": repos,
        "repos_count": len(repos),
        "connected_at": row.connected_at.isoformat() if row.connected_at else None,
    }


def resolve_github_token_and_repos(db: Session, org_id: str) -> tuple[str | None, list[str]]:
    row = get_github_connection(db, org_id)
    if row is not None and row.access_token:
        repos = parse_repos_json(row.repos_json)
        if repos:
            return row.access_token, repos
        if row.access_token:
            return row.access_token, _parse_env_repos()
    env_token = (os.getenv("GITHUB_TOKEN") or "").strip()
    env_repos = _parse_env_repos()
    if env_token and env_repos:
        return env_token, env_repos
    return None, []


def _parse_env_repos() -> list[str]:
    raw = (os.getenv("GITHUB_REPOS") or "").strip()
    return [r.strip() for r in raw.split(",") if r.strip()]
