"""Verify Clerk session JWTs and map Clerk identity → Outcome Ledger org."""

from __future__ import annotations

import logging
import os
from typing import Any

import jwt
from jwt import PyJWKClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Organization, OrganizationClerkLink
from app.outcome_contracts import ensure_default_contract
logger = logging.getLogger(__name__)

_jwks_cache: PyJWKClient | None = None


def clerk_enabled() -> bool:
    return bool((os.getenv("CLERK_SECRET_KEY") or "").strip())


def _jwt_issuer() -> str:
    issuer = (os.getenv("CLERK_JWT_ISSUER") or "").strip().rstrip("/")
    if not issuer:
        raise RuntimeError(
            "CLERK_JWT_ISSUER is required when using Clerk auth "
            "(e.g. https://your-app.clerk.accounts.dev)"
        )
    return issuer


def _get_jwks_client() -> PyJWKClient:
    global _jwks_cache
    if _jwks_cache is None:
        _jwks_cache = PyJWKClient(f"{_jwt_issuer()}/.well-known/jwks.json")
    return _jwks_cache


def _normalize_party(url: str) -> str:
    return url.strip().rstrip("/")


def _authorized_parties() -> list[str]:
    raw = (os.getenv("CLERK_AUTHORIZED_PARTIES") or "").strip()
    if not raw:
        return []
    return [_normalize_party(p) for p in raw.split(",") if p.strip()]


def verify_clerk_session_token(token: str) -> dict[str, Any]:
    """Validate Clerk session JWT; returns claims (sub, org_id, …)."""
    if not clerk_enabled():
        raise ValueError("Clerk is not configured on the API")
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    parties = _authorized_parties()
    # Clerk session tokens use `azp` (authorized party), not JWT `aud`.
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=_jwt_issuer(),
        options={"verify_aud": False},
    )
    if parties:
        azp = _normalize_party(str(claims.get("azp") or ""))
        if not azp or azp not in parties:
            raise jwt.InvalidAudienceError(
                f"Token azp {azp!r} not in CLERK_AUTHORIZED_PARTIES"
            )
    return claims


def _claims_user_id(claims: dict[str, Any]) -> str:
    sub = (claims.get("sub") or "").strip()
    if not sub:
        raise ValueError("Clerk token missing sub")
    return sub


def _claims_org_id(claims: dict[str, Any]) -> str | None:
    org = (claims.get("org_id") or "").strip()
    return org or None


def get_clerk_link(
    db: Session,
    *,
    clerk_user_id: str,
    clerk_org_id: str | None,
) -> OrganizationClerkLink | None:
    if clerk_org_id:
        row = (
            db.query(OrganizationClerkLink)
            .filter(OrganizationClerkLink.clerk_org_id == clerk_org_id)
            .first()
        )
        if row:
            return row
    return (
        db.query(OrganizationClerkLink)
        .filter(
            OrganizationClerkLink.clerk_user_id == clerk_user_id,
            OrganizationClerkLink.clerk_org_id.is_(None),
        )
        .first()
    )


def _any_clerk_link_for_user(db: Session, clerk_user_id: str) -> OrganizationClerkLink | None:
    return (
        db.query(OrganizationClerkLink)
        .filter(OrganizationClerkLink.clerk_user_id == clerk_user_id)
        .order_by(OrganizationClerkLink.created_at.asc())
        .first()
    )


def provision_clerk_tenant(
    db: Session,
    *,
    clerk_user_id: str,
    clerk_org_id: str | None,
    workspace_name: str | None = None,
    company_name: str | None = None,
) -> OrganizationClerkLink:
    existing = get_clerk_link(db, clerk_user_id=clerk_user_id, clerk_org_id=clerk_org_id)
    if existing:
        return existing

    import json

    name = (workspace_name or "").strip() or (
        f"Clerk org {clerk_org_id}" if clerk_org_id else "My workspace"
    )
    org = Organization(name=name)
    if company_name:
        org.profile_json = json.dumps({"companyName": company_name.strip()})
    db.add(org)
    db.flush()
    link = OrganizationClerkLink(
        org_id=org.id,
        clerk_user_id=clerk_user_id,
        clerk_org_id=clerk_org_id,
    )
    db.add(link)
    from app.tenant_auth import create_org_api_key

    create_org_api_key(db, org_id=org.id, name="clerk")
    ensure_default_contract(db, org.id)
    db.flush()
    logger.info(
        "Provisioned Clerk tenant org_id=%s clerk_user=%s clerk_org=%s",
        org.id,
        clerk_user_id,
        clerk_org_id,
    )
    return link


def resolve_org_id_from_clerk_token(db: Session, token: str) -> str:
    claims = verify_clerk_session_token(token)
    user_id = _claims_user_id(claims)
    org_id = _claims_org_id(claims)
    link = get_clerk_link(db, clerk_user_id=user_id, clerk_org_id=org_id)
    if not link:
        try:
            link = provision_clerk_tenant(
                db,
                clerk_user_id=user_id,
                clerk_org_id=org_id,
                workspace_name=claims.get("org_slug") or claims.get("org_name"),
            )
        except IntegrityError:
            db.rollback()
            link = get_clerk_link(db, clerk_user_id=user_id, clerk_org_id=org_id)
            if not link:
                link = _any_clerk_link_for_user(db, user_id)
            if not link:
                raise
    return link.org_id
