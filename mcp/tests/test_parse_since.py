import pytest

from outcome_ledger_mcp.sync import parse_since


def test_parse_days():
    assert parse_since("30d").days == 30


def test_parse_hours():
    assert parse_since("24h").total_seconds() == 86400


def test_invalid():
    with pytest.raises(ValueError):
        parse_since("bad")
