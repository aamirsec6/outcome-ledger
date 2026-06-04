"""Postgres tenant schema: FKs, partial indexes, schema version (ACID via PostgreSQL)."""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 2

_EXPECTED_TABLES = frozenset(
    {
        "organizations",
        "organization_clerk_links",
        "organization_api_keys",
        "provider_connections",
        "usage_events",
        "team_mappings",
        "sync_runs",
        "outcome_events",
        "outcome_contracts",
        "outcome_contract_changes",
        "outcome_contract_approvals",
        "report_runs",
        "cpst_snapshots",
        "waitlist_signups",
        "waitlist_page_views",
        "schema_migrations",
    }
)


def _is_postgres(engine: Engine) -> bool:
    return engine.dialect.name == "postgresql"


def bootstrap_postgres_schema(engine: Engine) -> None:
    """Idempotent constraints for multi-tenant isolation on PostgreSQL."""
    if not _is_postgres(engine):
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    version INTEGER NOT NULL,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        # Partial unique: one personal workspace per Clerk user (clerk_org_id IS NULL)
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_clerk_personal_user
                ON organization_clerk_links (clerk_user_id)
                WHERE clerk_org_id IS NULL
                """
            )
        )

        # Tenant query patterns
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_usage_events_org_period
                ON usage_events (org_id, period_start DESC)
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_outcome_events_org_occurred
                ON outcome_events (org_id, occurred_at DESC)
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_org_api_keys_org_active
                ON organization_api_keys (org_id)
                WHERE revoked_at IS NULL
                """
            )
        )

        conn.execute(
            text(
                """
                INSERT INTO schema_migrations (id, version)
                VALUES (1, :version)
                ON CONFLICT (id) DO UPDATE SET
                    version = EXCLUDED.version,
                    applied_at = NOW()
                """
            ),
            {"version": SCHEMA_VERSION},
        )

    logger.info("Postgres tenant schema bootstrap complete (version %s)", SCHEMA_VERSION)


def verify_schema(engine: Engine) -> dict:
    """Health check: required tables present."""
    expected = set(_EXPECTED_TABLES)
    if not _is_postgres(engine):
        expected.discard("schema_migrations")
    tables = set(inspect(engine).get_table_names())
    missing = sorted(expected - tables)
    extra_ok = tables >= _EXPECTED_TABLES
    version = None
    if "schema_migrations" in tables and _is_postgres(engine):
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT version FROM schema_migrations WHERE id = 1")
            ).first()
            if row:
                version = row[0]
    return {
        "ok": len(missing) == 0,
        "dialect": engine.dialect.name,
        "tables": len(tables),
        "missing": missing,
        "schemaVersion": version,
        "multiTenant": True,
    }
