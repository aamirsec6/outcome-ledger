from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./outcome_ledger.db")


def _create_engine():
    if DATABASE_URL.startswith("sqlite"):
        return create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
        )
    # PostgreSQL: ACID transactions, connection pooling, stale connection recovery
    return create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
    )


engine = _create_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# (table, column, sql_type) — idempotent adds for existing deployments
_LEGACY_COLUMN_MIGRATIONS: list[tuple[str, str, str]] = [
    ("outcome_events", "raw_json", "TEXT"),
    ("organizations", "win_definition", "TEXT"),
    ("organizations", "profile_json", "TEXT"),
    ("provider_connections", "config_json", "TEXT"),
    ("outcome_events", "workflow_type", "VARCHAR(32)"),
    ("cpst_snapshots", "linked_spend_pct", "FLOAT DEFAULT 0"),
    ("cpst_snapshots", "avg_link_confidence", "FLOAT DEFAULT 0"),
    ("cpst_snapshots", "workflow_json", "TEXT"),
]


def _migrate_legacy_columns() -> None:
    """Add columns on existing Postgres/SQLite DBs without Alembic."""
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    stmts: list[str] = []

    for table, column, sql_type in _LEGACY_COLUMN_MIGRATIONS:
        if table not in tables:
            continue
        cols = {c["name"] for c in insp.get_columns(table)}
        if column not in cols:
            stmts.append(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}")

    if not stmts:
        return

    with engine.begin() as conn:
        for sql in stmts:
            try:
                conn.execute(text(sql))
                logger.info("Applied migration: %s", sql)
            except Exception as exc:
                # Race or duplicate column on concurrent startup
                if "duplicate column" in str(exc).lower() or "already exists" in str(exc).lower():
                    logger.debug("Migration skipped (exists): %s", sql)
                else:
                    raise


def init_db() -> None:
    from app import models  # noqa: F401
    from app.schema_bootstrap import bootstrap_postgres_schema

    Base.metadata.create_all(bind=engine)
    _migrate_legacy_columns()
    bootstrap_postgres_schema(engine)


@contextmanager
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
