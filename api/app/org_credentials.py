"""Per-org integration secrets (stored in provider_connections)."""

from __future__ import annotations

import json
import os
from typing import Any

from sqlalchemy.orm import Session

from app.models import ProviderConnection


def _parse_config(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def get_connection(db: Session, org_id: str, provider: str) -> ProviderConnection | None:
    return (
        db.query(ProviderConnection)
        .filter(
            ProviderConnection.org_id == org_id,
            ProviderConnection.provider == provider,
        )
        .first()
    )


def save_connection(
    db: Session,
    *,
    org_id: str,
    provider: str,
    access_token: str,
    config: dict[str, Any] | None = None,
) -> ProviderConnection:
    row = get_connection(db, org_id, provider)
    config_json = json.dumps(config or {})
    if row:
        row.access_token = access_token.strip()
        row.config_json = config_json
        return row
    row = ProviderConnection(
        org_id=org_id,
        provider=provider,
        access_token=access_token.strip(),
        config_json=config_json,
    )
    db.add(row)
    db.flush()
    return row


def get_openai_credentials(db: Session, org_id: str) -> dict[str, str]:
    row = get_connection(db, org_id, "openai")
    if row and row.access_token:
        cfg = _parse_config(row.config_json)
        return {
            "api_key": row.access_token,
            "openai_org_id": (cfg.get("openai_org_id") or "").strip(),
            "project_id": (cfg.get("project_id") or "").strip(),
            "source": "database",
        }
    return {
        "api_key": (os.getenv("OPENAI_API_KEY") or "").strip(),
        "openai_org_id": (os.getenv("OPENAI_ORG_ID") or "").strip(),
        "project_id": (os.getenv("OPENAI_PROJECT_ID") or "").strip(),
        "source": "env",
    }


def get_anthropic_credentials(db: Session, org_id: str) -> dict[str, str]:
    row = get_connection(db, org_id, "anthropic")
    if row and row.access_token:
        return {"api_key": row.access_token, "source": "database"}
    return {
        "api_key": (os.getenv("ANTHROPIC_ADMIN_API_KEY") or "").strip(),
        "source": "env",
    }


def vendor_configured_for_org(db: Session, org_id: str, vendor: str) -> bool:
    if vendor == "openai":
        creds = get_openai_credentials(db, org_id)
        return bool(creds.get("api_key"))
    if vendor == "anthropic":
        creds = get_anthropic_credentials(db, org_id)
        return bool(creds.get("api_key"))
    if vendor == "github":
        row = get_connection(db, org_id, "github")
        return bool(row and row.access_token)
    return False


def connections_summary(db: Session, org_id: str) -> dict[str, dict]:
    openai = get_openai_credentials(db, org_id)
    anthropic = get_anthropic_credentials(db, org_id)
    github = get_connection(db, org_id, "github")
    return {
        "openai": {
            "configured": bool(openai.get("api_key")),
            "source": openai.get("source"),
            "hasOrgId": bool(openai.get("openai_org_id")),
            "hasProjectId": bool(openai.get("project_id")),
        },
        "anthropic": {
            "configured": bool(anthropic.get("api_key")),
            "source": anthropic.get("source"),
        },
        "github": {
            "configured": bool(github and github.access_token),
            "login": github.external_login if github else None,
        },
    }
