from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.clerk_auth import get_clerk_link, provision_clerk_tenant, resolve_org_id_from_clerk_token
from app.db import Base
from app.models import OrganizationClerkLink


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_get_clerk_link_falls_back_to_personal_when_org_missing(db):
    link = provision_clerk_tenant(
        db,
        clerk_user_id="user_abc",
        clerk_org_id=None,
    )
    db.commit()

    found = get_clerk_link(db, clerk_user_id="user_abc", clerk_org_id="org_xyz")
    assert found is not None
    assert found.org_id == link.org_id


def test_provision_is_idempotent_for_personal_user(db, monkeypatch):
    monkeypatch.setattr(
        "app.clerk_auth.verify_clerk_session_token",
        lambda _token: {"sub": "user_dup", "org_id": None},
    )

    first = provision_clerk_tenant(db, clerk_user_id="user_dup", clerk_org_id=None)
    db.commit()
    second = provision_clerk_tenant(db, clerk_user_id="user_dup", clerk_org_id=None)
    assert second.org_id == first.org_id
    assert db.query(OrganizationClerkLink).count() == 1


def test_resolve_recovers_from_integrity_error(db, monkeypatch):
    first = provision_clerk_tenant(db, clerk_user_id="user_race", clerk_org_id=None)
    db.commit()

    monkeypatch.setattr(
        "app.clerk_auth.verify_clerk_session_token",
        lambda _token: {"sub": "user_race", "org_id": None},
    )

    calls = [0]
    real_get = get_clerk_link

    def flaky_get(db, **kwargs):
        calls[0] += 1
        if calls[0] == 1:
            return None
        return real_get(db, **kwargs)

    monkeypatch.setattr("app.clerk_auth.get_clerk_link", flaky_get)

    def _boom(*_args, **_kwargs):
        raise IntegrityError("insert", {}, Exception("duplicate"))

    monkeypatch.setattr("app.clerk_auth.provision_clerk_tenant", _boom)

    org_id = resolve_org_id_from_clerk_token(db, "fake-token")
    assert org_id == first.org_id
