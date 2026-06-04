"""Production security — fail closed (audit P0)."""

from __future__ import annotations

import logging
import os

from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)


def is_production() -> bool:
    env = (os.getenv("ENV") or os.getenv("ENVIRONMENT") or "").strip().lower()
    if env in ("production", "prod"):
        return True
    return bool((os.getenv("RAILWAY_ENVIRONMENT") or "").strip())


def _api_key() -> str:
    return (os.getenv("OUTCOME_LEDGER_API_KEY") or "").strip()


def cors_origins() -> list[str]:
    raw = (os.getenv("CORS_ORIGINS") or "").strip()
    if is_production():
        if raw and raw != "*":
            return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
        dash = (os.getenv("DASHBOARD_URL") or "").strip().rstrip("/")
        if dash:
            logger.warning(
                "CORS_ORIGINS unset in production — using DASHBOARD_URL only"
            )
            return [dash]
        raise RuntimeError(
            "Production requires CORS_ORIGINS or DASHBOARD_URL (no wildcard)"
        )
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


def validate_startup_config() -> dict:
    """Called at startup; raises in production if misconfigured."""
    issues: list[str] = []
    key = _api_key()
    if is_production():
        if not key:
            issues.append("OUTCOME_LEDGER_API_KEY is required in production")
        cors = (os.getenv("CORS_ORIGINS") or "").strip()
        dash = (os.getenv("DASHBOARD_URL") or "").strip()
        if cors == "*" and not dash:
            issues.append(
                "Set CORS_ORIGINS to your dashboard URL (or DASHBOARD_URL) in production"
            )
        elif cors == "*" and dash:
            logger.warning(
                "CORS_ORIGINS=* in production — using DASHBOARD_URL for CORS only"
            )
        if not (os.getenv("GITHUB_OAUTH_CLIENT_ID") or "").strip():
            logger.warning("GITHUB_OAUTH_CLIENT_ID not set — GitHub connect disabled")
    if issues:
        msg = "; ".join(issues)
        if is_production():
            raise RuntimeError(f"Outcome Ledger config invalid: {msg}")
        logger.warning("Outcome Ledger config warnings: %s", msg)
    return {
        "production": is_production(),
        "apiKeyConfigured": bool(key),
        "corsOrigins": cors_origins(),
    }


def require_api_key(
    x_api_key: str | None = Header(default=None, alias="X-Api-Key"),
) -> None:
    expected = _api_key()
    if is_production():
        if not expected:
            raise HTTPException(
                status_code=503,
                detail="OUTCOME_LEDGER_API_KEY not configured on API",
            )
        if not x_api_key or x_api_key.strip() != expected:
            raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key")
        return
    if not expected:
        return
    if not x_api_key or x_api_key.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key")
