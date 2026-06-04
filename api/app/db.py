from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./outcome_ledger.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _migrate_legacy_columns() -> None:
    """Add columns on existing Postgres/SQLite DBs without Alembic."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    tables = set(insp.get_table_names())
    stmts = []
    if "outcome_events" in tables:
        cols = {c["name"] for c in insp.get_columns("outcome_events")}
        if "raw_json" not in cols:
            stmts.append("ALTER TABLE outcome_events ADD COLUMN raw_json TEXT")
    if "organizations" in tables:
        org_cols = {c["name"] for c in insp.get_columns("organizations")}
        if "win_definition" not in org_cols:
            stmts.append("ALTER TABLE organizations ADD COLUMN win_definition TEXT")
        if "profile_json" not in org_cols:
            stmts.append("ALTER TABLE organizations ADD COLUMN profile_json TEXT")
    if not stmts:
        return
    with engine.begin() as conn:
        for sql in stmts:
            conn.execute(text(sql))


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
