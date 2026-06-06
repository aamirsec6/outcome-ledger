"""Combined GitHub connection status (App preferred over OAuth)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.github_app import app_configured, app_status, get_app_connection
from app.github_oauth import _oauth_configured, get_github_connection, github_status as oauth_status
from app.github_oauth import parse_repos_json


def combined_github_status(db: Session, org_id: str) -> dict[str, Any]:
    app = app_status(db, org_id)
    oauth = oauth_status(db, org_id)

    if app.get("connected"):
        return {
            **app,
            "oauth_configured": _oauth_configured(),
            "oauth_connected": oauth.get("connected", False),
            "installUrl": None,
        }

    if oauth.get("connected"):
        return {
            **oauth,
            "mode": "oauth",
            "webhooks": False,
            "app_configured": app_configured(),
            "oauth_connected": True,
        }

    return {
        "connected": False,
        "mode": None,
        "webhooks": False,
        "oauth_configured": _oauth_configured(),
        "app_configured": app_configured(),
        "oauth_connected": False,
        "repos": [],
        "repos_count": 0,
    }


def github_is_connected(db: Session, org_id: str) -> bool:
    return get_app_connection(db, org_id) is not None or get_github_connection(db, org_id) is not None


def github_repos_for_org(db: Session, org_id: str) -> list[str]:
    app = get_app_connection(db, org_id)
    if app is not None:
        repos = parse_repos_json(app.repos_json)
        if repos:
            return repos
    oauth = get_github_connection(db, org_id)
    if oauth is not None:
        return parse_repos_json(oauth.repos_json)
    return []
