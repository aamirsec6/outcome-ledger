from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.ingest_anthropic import ingest_anthropic_costs
from app.ingest_github import ingest_github_merged_prs
from app.ingest_github_commits import ingest_github_default_branch_commits
from app.outcome_contracts import WIN_TYPE_COMMIT, primary_win_type
from app.ingest_openai import ingest_openai_costs
from app.attribution_engine import rebuild_attribution_graph
from app.cpst_history import record_cpst_snapshots
from app.outcome_contracts import ensure_default_contract
from app.revert_check import check_reverts
from app.sync_audit import finish_sync_run, start_sync_run


def run_full_sync(db: Session, org_id: str, *, trigger: str = "manual") -> dict:
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    run = start_sync_run(db, org_id, trigger)
    results: dict = {"ok": True, "trigger": trigger, "lookbackDays": lookback}
    try:
        results["openai"] = ingest_openai_costs(db, org_id=org_id, lookback_days=lookback)
        results["anthropic"] = ingest_anthropic_costs(
            db, org_id=org_id, lookback_days=lookback
        )
        win_type = primary_win_type(db, org_id)
        if win_type == WIN_TYPE_COMMIT:
            results["github"] = ingest_github_default_branch_commits(
                db, org_id=org_id, lookback_days=lookback
            )
            results["reverts"] = {
                "ok": True,
                "skipped": True,
                "reason": "revert scan applies to PR workflow only",
            }
        else:
            results["github"] = ingest_github_merged_prs(
                db, org_id=org_id, lookback_days=lookback
            )
            results["reverts"] = check_reverts(db, org_id)
        results["winType"] = win_type
        ensure_default_contract(db, org_id)
        results["attributionGraph"] = rebuild_attribution_graph(
            db, org_id, lookback_days=lookback
        )
        results["cpstSnapshots"] = record_cpst_snapshots(db, org_id)
        if results["openai"].get("ok") is False and results["openai"].get("error"):
            pass
    except Exception as exc:
        results["ok"] = False
        results["error"] = str(exc)
    finish_sync_run(db, run, results)
    results["syncRunId"] = run.id
    return results
