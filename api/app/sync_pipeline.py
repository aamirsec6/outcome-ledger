from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ingest_anthropic import ingest_anthropic_costs
from app.ingest_github import ingest_github_merged_prs
from app.ingest_github_commits import ingest_github_default_branch_commits
from app.outcome_contracts import WIN_TYPE_COMMIT, primary_win_type
from app.ingest_openai import ingest_openai_costs
from app.attribution_engine import rebuild_attribution_graph
from app.benchmarks import build_benchmark_report
from app.cpst_history import record_cpst_snapshots
from app.ingest_langfuse import ingest_langfuse_traces
from app.learned_linker import train_linker_model
from app.network_benchmarks import publish_org_benchmark
from app.org_profile import org_profile_payload
from app.outcome_contracts import ensure_default_contract
from app.revert_check import check_reverts
from app.notifications.delivery import deliver_post_sync_notifications
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
        results["langfuse"] = ingest_langfuse_traces(
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
        results["linkerModel"] = train_linker_model(db, org_id)
        results["cpstSnapshots"] = record_cpst_snapshots(db, org_id)
        bench = build_benchmark_report(db, org_id, lookback_days=lookback)
        profile = org_profile_payload(db, org_id)
        vertical = (profile.get("industry") or "engineering_saas").strip() or "engineering_saas"
        period = (bench.get("priorSnapshot") or {}).get("period") or datetime.now(
            timezone.utc
        ).strftime("%Y-%m")
        results["networkBenchmark"] = publish_org_benchmark(
            db,
            org_id,
            period=str(period),
            vertical=vertical,
            cpst_usd=float(bench["current"]["cpstUsd"]),
            linked_spend_pct=float(bench["current"]["linkedSpendPct"]),
            stable_outcomes=int(bench["current"]["stableOutcomes"]),
        )
        if results["openai"].get("ok") is False and results["openai"].get("error"):
            pass
        if results.get("ok"):
            new_ids = (results.get("github") or {}).get("newOutcomeIds") or []
            results["notifications"] = deliver_post_sync_notifications(
                db,
                org_id,
                bench=bench,
                new_outcome_ids=new_ids,
            )
    except Exception as exc:
        results["ok"] = False
        results["error"] = str(exc)
    finish_sync_run(db, run, results)
    results["syncRunId"] = run.id
    return results
