"""Onboarding checklist per tenant workspace."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.github_status import combined_github_status
from app.metrics import build_overview
from app.org_credentials import connections_summary, vendor_configured_for_org
from app.org_profile import org_profile_payload
from app.sync_audit import last_sync_run
from app.team_mapping import list_team_mappings


def build_onboarding_status(db: Session, org_id: str) -> dict:
    profile = org_profile_payload(db, org_id)
    connections = connections_summary(db, org_id)
    github = combined_github_status(db, org_id)
    teams = list_team_mappings(db, org_id)
    overview = build_overview(db, org_id, lookback_days=90)
    last_sync = last_sync_run(db, org_id)

    vendor_ok = (
        vendor_configured_for_org(db, org_id, "openai")
        or vendor_configured_for_org(db, org_id, "anthropic")
        or any(
            i.get("status") in ("connected", "csv")
            for i in overview.get("integrations", [])
            if i.get("id") in ("cursor", "claude-code")
        )
    )

    steps = [
        {
            "id": "workspace",
            "label": "Create workspace",
            "done": True,
        },
        {
            "id": "profile",
            "label": "Company profile",
            "done": bool((profile.get("companyName") or "").strip()),
        },
        {
            "id": "openai",
            "label": "Connect spend (OpenAI or other)",
            "done": vendor_ok,
        },
        {
            "id": "github",
            "label": "Connect GitHub",
            "done": bool(github.get("connected")),
        },
        {
            "id": "teams",
            "label": "Map repos → teams",
            "done": len(teams) > 0,
        },
        {
            "id": "sync",
            "label": "Run first sync",
            "done": last_sync is not None,
        },
    ]
    required = [s for s in steps if s["id"] != "teams"]
    done = sum(1 for s in steps if s["done"])
    required_done = sum(1 for s in required if s["done"])
    return {
        "orgId": org_id,
        "companyName": profile.get("companyName") or "",
        "steps": steps,
        "progress": {"done": done, "total": len(steps)},
        "requiredProgress": {"done": required_done, "total": len(required)},
        # Minimum: company + spend source + GitHub + first sync (team maps optional in Settings)
        "complete": required_done == len(required),
        "canSkip": required_done >= 2,
        "connections": connections,
        "vendorConfigured": vendor_ok,
        "attributedSpendPct": overview.get("attributedSpendPct", 0),
    }
