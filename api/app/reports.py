from __future__ import annotations

import csv
import io
import os

from sqlalchemy.orm import Session

from app.metrics import build_overview
from app.outcome_contracts import active_contract_payload, ensure_default_contract


def export_cpst_csv(db: Session, org_id: str, *, lookback_days: int = 90) -> str:
    ensure_default_contract(db, org_id)
    overview = build_overview(db, org_id, lookback_days=lookback_days)
    contract = active_contract_payload(db, org_id) or {}
    approval = contract.get("approval") or {}
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Outcome Ledger CPST Export"])
    writer.writerow(["Metric version", overview.get("metricVersion", "1.0")])
    writer.writerow(["Outcome contract version", contract.get("version", "")])
    writer.writerow(["Outcome contract status", contract.get("status", "")])
    writer.writerow(["CFO approved", "yes" if contract.get("cfoApproved") else "no"])
    if approval:
        writer.writerow(["CFO signer", approval.get("signerName", "")])
        writer.writerow(["CFO signed at", approval.get("signedAt", "")])
    writer.writerow(["Period", overview.get("periodLabel", "")])
    writer.writerow(["Total spend USD", overview.get("totalSpendUsd", 0)])
    writer.writerow(["Stable outcomes", overview.get("stableOutcomes", 0)])
    writer.writerow(["Pending outcomes (< stable window)", overview.get("pendingOutcomes", 0)])
    writer.writerow(["Reverted outcomes", overview.get("revertedOutcomes", 0)])
    writer.writerow(["Org CPST USD", overview.get("orgCpstUsd", 0)])
    writer.writerow(["Attributed spend %", overview.get("attributedSpendPct", 0)])
    writer.writerow(["Failure cost share %", overview.get("failureCostShare", 0)])
    writer.writerow([])
    writer.writerow(["team_id", "spend_usd", "stable_outcomes", "cpst_usd"])
    for team in overview.get("teams", []):
        writer.writerow(
            [
                team.get("teamId"),
                team.get("spendUsd"),
                team.get("acceptedOutcomes"),
                team.get("cpstUsd"),
            ]
        )
    writer.writerow([])
    writer.writerow(["Formula", "CPST = total_spend / stable_accepted_outcomes"])
    writer.writerow(
        ["Stable window days", os.getenv("OUTCOME_STABLE_DAYS", "7")],
    )
    return buf.getvalue()
