"""Unified GitHub credentials — prefer GitHub App over OAuth."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.github_app import resolve_app_token_and_repos
from app.github_oauth import resolve_github_token_and_repos as resolve_oauth


def resolve_github_token_and_repos(db: Session, org_id: str) -> tuple[str | None, list[str]]:
    token, repos = resolve_app_token_and_repos(db, org_id)
    if token and repos:
        return token, repos
    if token and not repos:
        return token, []
    return resolve_oauth(db, org_id)


def github_connection_mode(db: Session, org_id: str) -> str | None:
    from app.github_app import get_app_connection, app_configured

    if get_app_connection(db, org_id) is not None:
        return "app"
    from app.github_oauth import get_github_connection

    if get_github_connection(db, org_id) is not None:
        return "oauth"
    if app_configured():
        return "app_available"
    return None
