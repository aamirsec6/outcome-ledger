"""AI adoption diagnostics hints."""

from __future__ import annotations

from app.ai_adoption import _build_adoption_diagnostics


def test_team_mismatch_hint_when_spend_and_wins_diverge():
    hints = _build_adoption_diagnostics(
        total_spend=23.6,
        stable_total=35,
        ai_assisted=0,
        ai_assisted_pct=0.0,
        distinct_ai_users=0,
        team_outcomes={"aamirsec6": 35},
        team_spend={"eng": 23.6},
        code_attribution={"available": True, "aiPct": 0.0, "byMethod": {"github_diff": 34}},
        cursor_api_configured=False,
    )
    ids = {h["id"] for h in hints}
    assert "team_mismatch" in ids
    assert "no_billed_users" in ids
    assert "no_cursor_api" in ids
