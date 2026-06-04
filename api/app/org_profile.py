from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Organization

PROFILE_KEYS = (
    "companyName",
    "legalName",
    "tagline",
    "stage",
    "industry",
    "website",
    "headquarters",
)


def _env_default(key: str) -> str:
    env_map = {
        "companyName": "ORGANIZATION_NAME",
        "legalName": "ORGANIZATION_LEGAL_NAME",
        "tagline": "ORGANIZATION_TAGLINE",
        "stage": "ORGANIZATION_STAGE",
        "industry": "ORGANIZATION_INDUSTRY",
        "website": "ORGANIZATION_WEBSITE",
        "headquarters": "ORGANIZATION_HEADQUARTERS",
    }
    return (os.getenv(env_map.get(key, "")) or "").strip()


def parse_profile_json(raw: str | None) -> dict[str, str]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return {k: str(data[k]).strip() for k in PROFILE_KEYS if data.get(k)}
    except json.JSONDecodeError:
        pass
    return {}


def org_profile_payload(db: Session, org_id: str) -> dict[str, str]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    stored = parse_profile_json(org.profile_json if org else None)
    company = (
        stored.get("companyName")
        or (org.name if org and org.name != "Default org" else "")
        or _env_default("companyName")
        or "Your organization"
    )
    out: dict[str, str] = {"companyName": company}
    for key in PROFILE_KEYS:
        if key == "companyName":
            continue
        val = stored.get(key) or _env_default(key)
        if val:
            out[key] = val
    return out


def update_org_profile(db: Session, org_id: str, payload: dict[str, str]) -> dict[str, str]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise ValueError("Organization not found")
    current = parse_profile_json(org.profile_json)
    for key in PROFILE_KEYS:
        if key in payload:
            val = (payload[key] or "").strip()
            if val:
                current[key] = val
            elif key in current:
                del current[key]
    if current.get("companyName"):
        org.name = current["companyName"]
    org.profile_json = json.dumps(current) if current else None
    db.flush()
    return org_profile_payload(db, org_id)


def profile_subtitle(profile: dict[str, str]) -> str:
    parts = []
    if profile.get("tagline"):
        parts.append(profile["tagline"])
    if profile.get("stage"):
        parts.append(profile["stage"])
    if profile.get("industry"):
        parts.append(profile["industry"])
    return " · ".join(parts)


def profile_meta_lines(profile: dict[str, str], period_label: str) -> list[str]:
    lines = []
    if profile.get("legalName"):
        lines.append(profile["legalName"])
    if profile.get("headquarters"):
        lines.append(profile["headquarters"])
    if profile.get("website"):
        lines.append(profile["website"])
    lines.append(f"Reporting period: {period_label}")
    lines.append(
        f"Prepared: {datetime.now(timezone.utc).strftime('%B %d, %Y')} (UTC)"
    )
    return lines
