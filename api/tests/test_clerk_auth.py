from __future__ import annotations

from app.clerk_auth import _authorized_parties, _normalize_party


def test_normalize_party():
    assert _normalize_party("https://app.example.com/") == "https://app.example.com"


def test_authorized_parties_parsing(monkeypatch):
    monkeypatch.setenv(
        "CLERK_AUTHORIZED_PARTIES",
        "https://a.example.com, https://b.example.com/",
    )
    assert _authorized_parties() == [
        "https://a.example.com",
        "https://b.example.com",
    ]
