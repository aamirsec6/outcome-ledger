from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.metrics import build_overview
from app.models import ReportRun
from app.outcome_contracts import active_contract_payload, ensure_default_contract

logger = logging.getLogger(__name__)

STATUS_DRAFT = "draft"
STATUS_APPROVED = "approved"


def _metrics_payload(db: Session, org_id: str, *, lookback_days: int) -> dict:
    overview = build_overview(db, org_id, lookback_days=lookback_days)
    contract = active_contract_payload(db, org_id) or {}
    return {
        "overview": overview,
        "contract": {
            "version": contract.get("version"),
            "status": contract.get("status"),
            "cfoApproved": contract.get("cfoApproved"),
        },
    }


def _template_narrative(metrics: dict) -> str:
    o = metrics.get("overview") or {}
    period = o.get("periodLabel", "Current period")
    spend = o.get("totalSpendUsd", 0)
    stable = o.get("stableOutcomes", o.get("totalOutcomes", 0))
    pending = o.get("pendingOutcomes", 0)
    reverted = o.get("revertedOutcomes", 0)
    cpst = o.get("orgCpstUsd", 0)
    attr = o.get("attributedSpendPct", 0)
    failure = o.get("failureCostShare", 0)
    metric_v = o.get("metricVersion", "1.0")

    lines = [
        "Executive summary",
        "",
        f"Period: {period}",
        f"Total AI spend: ${spend:,.2f}",
        f"CPST metric version: {metric_v}",
        f"Stable accepted outcomes: {stable}",
        f"Pending (stability window): {pending}",
        f"Reverted outcomes: {reverted}",
        f"Organization CPST: ${cpst:,.2f}",
        f"Attributed spend: {attr}% of total (target >=80%)",
        f"Failure cost share: {failure}%",
        "",
    ]

    teams = o.get("teams") or []
    if stable == 0 and spend > 0:
        lines.append(
            "Key finding: Spend is recorded but no stable outcomes yet. "
            "Connect GitHub, run sync, and confirm the outcome contract."
        )
    elif teams:
        sorted_teams = sorted(teams, key=lambda t: t.get("cpstUsd", 0), reverse=True)
        top = sorted_teams[0]
        median = sorted_teams[len(sorted_teams) // 2]["cpstUsd"]
        if top.get("cpstUsd", 0) > median * 1.2 and median > 0:
            lines.append(
                f"Key finding: {top.get('teamName')} CPST (${top.get('cpstUsd'):,.2f}) "
                f"exceeds the org median — review retry loops and review load."
            )
        else:
            lines.append(
                f"Key finding: {stable} stable outcome(s); org CPST is ${cpst:,.2f}."
            )
    else:
        lines.append(f"Key finding: Org CPST is ${cpst:,.2f} with {stable} outcomes.")

    pending_int = [
        i.get("name")
        for i in (o.get("integrations") or [])
        if i.get("status") == "pending"
    ]
    lines.extend(["", "Recommendations:"])
    if attr < 80:
        lines.append(
            f"- Raise attribution coverage from {attr}% to >=80% via team mappings and vendor keys."
        )
    if pending_int:
        lines.append(f"- Connect remaining sources: {', '.join(pending_int)}.")
    lines.append("- Re-sync monthly; export board pack after CFO approves this narrative.")

    contract = metrics.get("contract") or {}
    if contract.get("cfoApproved"):
        lines.append(
            f"- Outcome contract v{contract.get('version')} is CFO-approved for this CPST definition."
        )
    else:
        lines.append("- Obtain CFO sign-off on the active outcome contract before board distribution.")

    lines.extend(
        [
            "",
            "- Generated from precomputed metrics only (deterministic template). "
            "Numbers in this memo match the metrics store.",
        ]
    )
    return "\n".join(lines)


def _llm_narrative(metrics: dict) -> tuple[str, str]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return _template_narrative(metrics), "template"

    model = (os.getenv("EXECUTIVE_REPORT_MODEL") or "gpt-4.1-mini").strip()
    system = (
        "You write board-ready executive memos for engineering AI ROI. "
        "Use ONLY numbers and facts present in the JSON. Do not invent metrics. "
        "If a value is missing, say it is unavailable. Output plain text, 3–5 short paragraphs, "
        "then 3 bullet recommendations. No markdown headers."
    )
    user = json.dumps(metrics, default=str)
    try:
        with httpx.Client(timeout=60.0) as client:
            res = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "temperature": 0,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            res.raise_for_status()
            data = res.json()
            text = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if text:
                footer = (
                    "\n\n- LLM narrative from metrics JSON only. "
                    f"Model: {model}. Verify figures against export."
                )
                return text + footer, model
    except Exception as e:
        logger.warning("Executive LLM failed, using template: %s", e)

    return _template_narrative(metrics), "template"


def create_executive_report(
    db: Session, org_id: str, *, lookback_days: int = 90
) -> dict:
    ensure_default_contract(db, org_id)
    metrics = _metrics_payload(db, org_id, lookback_days=lookback_days)
    narrative, model = _llm_narrative(metrics)
    row = ReportRun(
        org_id=org_id,
        status=STATUS_DRAFT,
        narrative=narrative,
        model=model,
        input_row_count=len(json.dumps(metrics)),
        metrics_json=json.dumps(metrics, default=str),
    )
    db.add(row)
    db.flush()
    return report_run_to_dict(row)


def latest_executive_report(db: Session, org_id: str) -> dict | None:
    row = (
        db.query(ReportRun)
        .filter(ReportRun.org_id == org_id)
        .order_by(ReportRun.created_at.desc())
        .first()
    )
    if not row:
        return None
    return report_run_to_dict(row)


def approve_executive_report(
    db: Session, org_id: str, report_id: str, *, signer_name: str
) -> dict:
    row = (
        db.query(ReportRun)
        .filter(ReportRun.id == report_id, ReportRun.org_id == org_id)
        .first()
    )
    if not row:
        raise ValueError("Report not found")
    row.status = STATUS_APPROVED
    row.approved_by = signer_name.strip()
    row.approved_at = datetime.now(timezone.utc)
    db.flush()
    return report_run_to_dict(row)


def get_report_for_export(db: Session, org_id: str) -> ReportRun | None:
    """Latest approved report, or latest draft if none approved."""
    approved = (
        db.query(ReportRun)
        .filter(
            ReportRun.org_id == org_id,
            ReportRun.status == STATUS_APPROVED,
        )
        .order_by(ReportRun.approved_at.desc())
        .first()
    )
    if approved:
        return approved
    return (
        db.query(ReportRun)
        .filter(ReportRun.org_id == org_id)
        .order_by(ReportRun.created_at.desc())
        .first()
    )


def report_run_to_dict(row: ReportRun) -> dict:
    metrics_hash = hashlib.sha256((row.metrics_json or "").encode()).hexdigest()[:12]
    return {
        "id": row.id,
        "status": row.status,
        "narrative": row.narrative,
        "model": row.model,
        "inputRowCount": row.input_row_count,
        "metricsHash": metrics_hash,
        "approvedBy": row.approved_by,
        "approvedAt": row.approved_at.isoformat() if row.approved_at else None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }
