"""Tenant API key management (agent / dashboard keys)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import OrganizationApiKey
from app.tenant_auth import create_org_api_key


def _row_to_dict(row: OrganizationApiKey) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "keyPrefix": row.key_prefix,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "revokedAt": row.revoked_at.isoformat() if row.revoked_at else None,
    }


WORKSPACE_KEY_NAMES = ("agent", "clerk", "dashboard")


def primary_workspace_key(db: Session, org_id: str) -> dict | None:
    """First active workspace key (agent preferred, then clerk from sign-up)."""
    for name in WORKSPACE_KEY_NAMES:
        row = (
            db.query(OrganizationApiKey)
            .filter(
                OrganizationApiKey.org_id == org_id,
                OrganizationApiKey.name == name,
                OrganizationApiKey.revoked_at.is_(None),
            )
            .first()
        )
        if row:
            return _row_to_dict(row)
    return None


def reveal_workspace_api_key(db: Session, org_id: str) -> dict:
    """Return a viewable ol_* key — creates agent key or rotates existing agent key."""
    active_agent = list_active_agent_keys(db, org_id)
    if active_agent:
        return rotate_agent_api_key(db, org_id)
    return create_named_api_key(db, org_id, name="agent")


def list_org_api_keys(db: Session, org_id: str) -> list[dict]:
    rows = (
        db.query(OrganizationApiKey)
        .filter(OrganizationApiKey.org_id == org_id)
        .order_by(OrganizationApiKey.created_at.desc())
        .all()
    )
    return [_row_to_dict(r) for r in rows]


def list_active_agent_keys(db: Session, org_id: str) -> list[dict]:
    rows = (
        db.query(OrganizationApiKey)
        .filter(
            OrganizationApiKey.org_id == org_id,
            OrganizationApiKey.name == "agent",
            OrganizationApiKey.revoked_at.is_(None),
        )
        .order_by(OrganizationApiKey.created_at.desc())
        .all()
    )
    return [_row_to_dict(r) for r in rows]


def create_named_api_key(db: Session, org_id: str, *, name: str = "agent") -> dict:
    raw, row = create_org_api_key(db, org_id=org_id, name=name)
    return {
        "apiKey": raw,
        "keyPrefix": row.key_prefix,
        "name": row.name,
        "id": row.id,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "message": "Save this key now — it will not be shown again.",
    }


def rotate_agent_api_key(db: Session, org_id: str) -> dict:
    now = datetime.now(timezone.utc)
    (
        db.query(OrganizationApiKey)
        .filter(
            OrganizationApiKey.org_id == org_id,
            OrganizationApiKey.name == "agent",
            OrganizationApiKey.revoked_at.is_(None),
        )
        .update({OrganizationApiKey.revoked_at: now})
    )
    return create_named_api_key(db, org_id, name="agent")


def ensure_agent_api_key(db: Session, org_id: str) -> dict:
    """Return existing active agent key metadata, or create and return new raw key."""
    active = list_active_agent_keys(db, org_id)
    if active:
        return {
            "apiKey": None,
            "keyPrefix": active[0]["keyPrefix"],
            "name": "agent",
            "id": active[0]["id"],
            "createdAt": active[0]["createdAt"],
            "existing": True,
            "message": "An agent key already exists. Rotate to generate a new key.",
        }
    return create_named_api_key(db, org_id, name="agent")
