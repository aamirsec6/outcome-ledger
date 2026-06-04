"""Per-request org id (set by tenant auth middleware)."""

from __future__ import annotations

from contextvars import ContextVar

_request_org_id: ContextVar[str | None] = ContextVar("request_org_id", default=None)


def get_request_org_id() -> str | None:
    return _request_org_id.get()


def set_request_org_id(org_id: str) -> None:
    _request_org_id.set(org_id)
