from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import Organization
from app.tenant_api_keys import (
    create_named_api_key,
    ensure_agent_api_key,
    list_org_api_keys,
    primary_workspace_key,
    reveal_workspace_api_key,
    rotate_agent_api_key,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    org = Organization(name="Test")
    session.add(org)
    session.flush()
    yield session, org.id
    session.close()


def test_primary_workspace_key_prefers_clerk(db):
    session, org_id = db
    create_named_api_key(session, org_id, name="clerk")
    primary = primary_workspace_key(session, org_id)
    assert primary is not None
    assert primary["name"] == "clerk"


def test_reveal_creates_agent_key(db):
    session, org_id = db
    create_named_api_key(session, org_id, name="clerk")
    revealed = reveal_workspace_api_key(session, org_id)
    assert revealed["apiKey"].startswith("ol_")
    assert revealed["name"] == "agent"


def test_create_and_rotate_agent_key(db):
    session, org_id = db
    first = ensure_agent_api_key(session, org_id)
    assert first.get("apiKey") or first.get("existing")
    second = ensure_agent_api_key(session, org_id)
    assert second.get("existing") is True
    rotated = rotate_agent_api_key(session, org_id)
    assert rotated["apiKey"].startswith("ol_")
    keys = list_org_api_keys(session, org_id)
    revoked = [k for k in keys if k["name"] == "agent" and k["revokedAt"]]
    active = [k for k in keys if k["name"] == "agent" and not k["revokedAt"]]
    assert len(revoked) >= 1
    assert len(active) == 1
