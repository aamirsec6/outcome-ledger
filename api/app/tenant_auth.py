"""Per-tenant API keys + request org context (multi-tenant control plane)."""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
from fastapi import Header, HTTPException

from app.clerk_auth import clerk_enabled, resolve_org_id_from_clerk_token
from sqlalchemy.orm import Session

from app.db import get_db
from app.metrics import ensure_default_org
from app.models import Organization, OrganizationApiKey
from app.security import _api_key, is_production

logger = logging.getLogger(__name__)

from app.request_context import get_request_org_id, set_request_org_id

KEY_PREFIX = "ol_"


def _pepper() -> str:
    return (
        os.getenv("TENANT_KEY_PEPPER")
        or os.getenv("OUTCOME_LEDGER_API_KEY")
        or "dev-tenant-pepper"
    ).strip()


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(f"{raw_key}:{_pepper()}".encode()).hexdigest()


def generate_tenant_api_key() -> str:
    return f"{KEY_PREFIX}{secrets.token_urlsafe(32)}"


def create_org_api_key(
    db: Session,
    *,
    org_id: str,
    name: str = "default",
) -> tuple[str, OrganizationApiKey]:
    raw = generate_tenant_api_key()
    row = OrganizationApiKey(
        org_id=org_id,
        key_prefix=raw[:12],
        key_hash=hash_api_key(raw),
        name=name,
    )
    db.add(row)
    db.flush()
    return raw, row


def resolve_org_id_from_api_key(db: Session, x_api_key: str | None) -> str:
    """Map X-Api-Key to org_id. Tenant keys (ol_*) first; global env → default org."""
    key = (x_api_key or "").strip()
    global_key = _api_key()

    if key.startswith(KEY_PREFIX):
        digest = hash_api_key(key)
        row = (
            db.query(OrganizationApiKey)
            .filter(
                OrganizationApiKey.key_hash == digest,
                OrganizationApiKey.revoked_at.is_(None),
            )
            .first()
        )
        if row:
            return row.org_id
        raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key")

    if global_key and key == global_key:
        return ensure_default_org(db)

    if not is_production() and not global_key and not key:
        return ensure_default_org(db)

    raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key")


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip() or None
    return None


def require_tenant_auth(
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
    authorization: str | None = Header(default=None),
) -> None:
    """Validate Clerk JWT, tenant API key (ol_), or platform key."""
    global_key = _api_key()
    key = (x_api_key or "").strip()
    bearer = _bearer_token(authorization)

    if is_production():
        if not global_key and not key and not (bearer and clerk_enabled()):
            raise HTTPException(
                status_code=503,
                detail="Configure Clerk, OUTCOME_LEDGER_API_KEY, or tenant API key",
            )
        if not key and not bearer:
            raise HTTPException(status_code=401, detail="Invalid or missing credentials")

    with get_db() as db:
        if bearer and clerk_enabled():
            try:
                org_id = resolve_org_id_from_clerk_token(db, bearer)
            except Exception as exc:
                logger.warning("Clerk auth failed: %s", exc)
                raise HTTPException(
                    status_code=401, detail="Invalid Clerk session"
                ) from exc
        else:
            org_id = resolve_org_id_from_api_key(db, x_api_key)
        set_request_org_id(org_id)


def register_tenant(db: Session, *, name: str, company_name: str | None = None) -> dict:
    org = Organization(name=name.strip() or "New workspace")
    if company_name:
        import json

        org.profile_json = json.dumps({"companyName": company_name.strip()})
    db.add(org)
    db.flush()
    raw_key, _ = create_org_api_key(db, org_id=org.id, name="dashboard")
    from app.outcome_contracts import ensure_default_contract

    ensure_default_contract(db, org.id)
    return {
        "orgId": org.id,
        "name": org.name,
        "apiKey": raw_key,
    }
