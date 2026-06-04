from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./outcome_ledger.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# (table, column, sql_type) — idempotent adds for existing deployments
_LEGACY_COLUMN_MIGRATIONS: list[tuple[str, str, str]] = [
    ("outcome_events", "raw_json", "TEXT"),
    ("organizations", "win_definition", "TEXT"),
    ("organizations", "profile_json", "TEXT"),
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

    Base.metadata.create_all(bind=engine)
    _migrate_legacy_columns()


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
