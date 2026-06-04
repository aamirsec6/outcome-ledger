from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.constants import metric_version
from app.models import (
    Organization,
    OutcomeContract,
    OutcomeContractApproval,
    OutcomeContractChange,
)
from app.revert_check import stable_days

DEFAULT_ATTESTATION = (
    "I attest that the outcome definitions in this contract version are how our "
    "organization will measure accepted AI-assisted engineering outcomes for board, "
    "FP&A, and operational reporting. CPST and related exports will use this "
    "methodology until a newer published contract supersedes it."
)

DEFAULT_CONTRACT_TITLE = "Engineering AI outcome contract"
DEFAULT_CONTRACT_SUMMARY = (
    "An accepted outcome is a merged pull request that remains stable: not reverted "
    "within the stability window. Fully loaded AI tool spend (including failed runs "
    "and retries) is divided by the count of stable accepted outcomes to produce CPST."
)

WIN_TYPE_PR = "pr_merged_stable"
WIN_TYPE_COMMIT = "default_branch_commit"

WIN_TYPE_OPTIONS = [
    {
        "id": WIN_TYPE_PR,
        "label": "Merged pull request",
        "description": "Count PRs merged to the default branch (excludes direct pushes).",
    },
    {
        "id": WIN_TYPE_COMMIT,
        "label": "Default branch commit",
        "description": "Count commits on master/main (your direct-ship workflow). Skips merge commits from PRs.",
    },
]


def _default_spec(win_type: str = WIN_TYPE_PR) -> dict:
    return spec_for_win_type(win_type)


def spec_for_win_type(win_type: str) -> dict:
    days = stable_days()
    if win_type == WIN_TYPE_COMMIT:
        primary = {
            "id": WIN_TYPE_COMMIT,
            "label": "Default branch commit",
            "acceptedWhen": (
                f"Non-merge commit on repository default branch (master/main) "
                f"within lookback; stability window {days} days when enabled"
            ),
            "stableDays": days,
            "countsTowardCpst": True,
        }
    else:
        win_type = WIN_TYPE_PR
        primary = {
            "id": WIN_TYPE_PR,
            "label": "Stable merged PR",
            "acceptedWhen": (
                "PR merged to default branch and not reverted within "
                f"{days} days"
            ),
            "stableDays": days,
            "countsTowardCpst": True,
        }
    return {
        "primaryWinType": win_type,
        "outcomeTypes": [primary],
        "formula": {
            "id": "cpst",
            "version": metric_version(),
            "numerator": "fully_loaded_ai_spend",
            "denominator": "stable_accepted_outcomes",
            "includeFailuresInNumerator": True,
            "expression": "CPST = total_spend_usd / stable_outcomes",
        },
    }


def summary_for_win_type(win_type: str) -> str:
    if win_type == WIN_TYPE_COMMIT:
        return (
            "An accepted win is a commit on your repository default branch (master/main) "
            "within the lookback window. Merge commits from pull requests are excluded so "
            "PR and direct-push workflows are not double-counted. Fully loaded AI spend "
            "is divided by stable accepted outcomes to produce CPST."
        )
    return DEFAULT_CONTRACT_SUMMARY


def primary_win_type_from_spec(spec: dict) -> str:
    if spec.get("primaryWinType") in (WIN_TYPE_PR, WIN_TYPE_COMMIT):
        return spec["primaryWinType"]
    types = spec.get("outcomeTypes") or []
    if types:
        return types[0].get("id") or WIN_TYPE_PR
    return WIN_TYPE_PR


def primary_win_type(db: Session, org_id: str) -> str:
    ensure_default_contract(db, org_id)
    active = get_active_contract(db, org_id)
    if not active:
        return WIN_TYPE_PR
    try:
        spec = json.loads(active.spec_json or "{}")
    except json.JSONDecodeError:
        return WIN_TYPE_PR
    return primary_win_type_from_spec(spec)


def cpst_outcome_types(db: Session, org_id: str) -> list[str]:
    active = get_active_contract(db, org_id)
    if not active:
        return [WIN_TYPE_PR]
    try:
        spec = json.loads(active.spec_json or "{}")
    except json.JSONDecodeError:
        return [WIN_TYPE_PR]
    ids = [
        t["id"]
        for t in (spec.get("outcomeTypes") or [])
        if t.get("countsTowardCpst") and t.get("id")
    ]
    return ids or [primary_win_type_from_spec(spec)]


def get_win_settings(db: Session, org_id: str) -> dict:
    ensure_default_contract(db, org_id)
    active = get_active_contract(db, org_id)
    contract = active_contract_payload(db, org_id)
    win_type = primary_win_type(db, org_id)
    return {
        "winType": win_type,
        "stableDays": stable_days(),
        "options": WIN_TYPE_OPTIONS,
        "summary": contract.get("summary") if contract else summary_for_win_type(win_type),
        "contract": contract,
        "needsCfoResign": bool(contract and not contract.get("cfoApproved")),
    }


def apply_win_settings(
    db: Session,
    org_id: str,
    *,
    win_type: str,
    actor: str = "settings",
) -> OutcomeContract:
    if win_type not in (WIN_TYPE_PR, WIN_TYPE_COMMIT):
        raise ValueError(f"winType must be {WIN_TYPE_PR} or {WIN_TYPE_COMMIT}")
    current = primary_win_type(db, org_id)
    if current == win_type:
        active = get_active_contract(db, org_id)
        if active:
            return active
    spec = spec_for_win_type(win_type)
    summary = summary_for_win_type(win_type)
    draft = create_draft_contract(
        db, org_id, summary=summary, spec=spec, actor=actor
    )
    published = publish_contract(db, org_id, draft.id, actor=actor)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if org:
        org.win_definition = summary
    _log_change(
        db,
        org_id=org_id,
        contract_id=published.id,
        action="win_type_changed",
        actor=actor,
        detail={"winType": win_type, "from": current},
    )
    return published


def _log_change(
    db: Session,
    *,
    org_id: str,
    contract_id: str,
    action: str,
    actor: str | None = None,
    detail: dict | None = None,
) -> None:
    db.add(
        OutcomeContractChange(
            org_id=org_id,
            contract_id=contract_id,
            action=action,
            actor=actor,
            detail_json=json.dumps(detail or {}),
        )
    )


def contract_to_dict(
    row: OutcomeContract,
    *,
    approval: OutcomeContractApproval | None = None,
) -> dict:
    spec = {}
    try:
        spec = json.loads(row.spec_json or "{}")
    except json.JSONDecodeError:
        spec = {}
    out = {
        "id": row.id,
        "orgId": row.org_id,
        "version": row.version,
        "status": row.status,
        "title": row.title,
        "summary": row.summary,
        "spec": spec,
        "metricVersion": row.metric_version,
        "createdBy": row.created_by,
        "publishedBy": row.published_by,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "publishedAt": row.published_at.isoformat() if row.published_at else None,
        "supersededAt": row.superseded_at.isoformat() if row.superseded_at else None,
        "cfoApproved": approval is not None,
    }
    if approval:
        out["approval"] = {
            "signerName": approval.signer_name,
            "signerEmail": approval.signer_email,
            "signerTitle": approval.signer_title,
            "role": approval.role,
            "signedAt": approval.signed_at.isoformat() if approval.signed_at else None,
            "attestationText": approval.attestation_text,
        }
    return out


def _approval_for_contract(db: Session, contract_id: str) -> OutcomeContractApproval | None:
    return (
        db.query(OutcomeContractApproval)
        .filter(OutcomeContractApproval.contract_id == contract_id)
        .first()
    )


def get_active_contract(db: Session, org_id: str) -> OutcomeContract | None:
    return (
        db.query(OutcomeContract)
        .filter(
            OutcomeContract.org_id == org_id,
            OutcomeContract.status == "active",
        )
        .order_by(OutcomeContract.published_at.desc())
        .first()
    )


def active_contract_payload(db: Session, org_id: str) -> dict | None:
    row = get_active_contract(db, org_id)
    if not row:
        return None
    return contract_to_dict(row, approval=_approval_for_contract(db, row.id))


def _next_version(db: Session, org_id: str) -> str:
    rows = (
        db.query(OutcomeContract.version)
        .filter(OutcomeContract.org_id == org_id)
        .all()
    )
    if not rows:
        return "1.0"
    nums: list[float] = []
    for (ver,) in rows:
        try:
            nums.append(float(ver))
        except ValueError:
            nums.append(1.0)
    return f"{max(nums) + 0.1:.1f}"


def ensure_default_contract(db: Session, org_id: str) -> OutcomeContract:
    active = get_active_contract(db, org_id)
    if active:
        return active

    draft = (
        db.query(OutcomeContract)
        .filter(
            OutcomeContract.org_id == org_id,
            OutcomeContract.status == "draft",
        )
        .first()
    )
    if draft:
        return _publish_contract(db, draft, actor="system", auto=True)

    spec = _default_spec()
    org = db.query(Organization).filter(Organization.id == org_id).first()
    summary = DEFAULT_CONTRACT_SUMMARY
    if org and getattr(org, "win_definition", None) and org.win_definition.strip():
        summary = org.win_definition.strip()

    row = OutcomeContract(
        org_id=org_id,
        version="1.0",
        status="draft",
        title=DEFAULT_CONTRACT_TITLE,
        summary=summary,
        spec_json=json.dumps(spec),
        metric_version=metric_version(),
        created_by="system",
    )
    db.add(row)
    db.flush()
    _log_change(db, org_id=org_id, contract_id=row.id, action="created", actor="system")
    return _publish_contract(db, row, actor="system", auto=True)


def _publish_contract(
    db: Session,
    row: OutcomeContract,
    *,
    actor: str,
    auto: bool = False,
) -> OutcomeContract:
    now = datetime.now(timezone.utc)
    for prev in (
        db.query(OutcomeContract)
        .filter(
            OutcomeContract.org_id == row.org_id,
            OutcomeContract.status == "active",
            OutcomeContract.id != row.id,
        )
        .all()
    ):
        prev.status = "superseded"
        prev.superseded_at = now
        _log_change(
            db,
            org_id=row.org_id,
            contract_id=prev.id,
            action="superseded",
            actor=actor,
            detail={"supersededBy": row.id, "version": row.version},
        )

    row.status = "active"
    row.published_at = now
    row.published_by = actor
    db.flush()
    _log_change(
        db,
        org_id=row.org_id,
        contract_id=row.id,
        action="published",
        actor=actor,
        detail={"auto": auto, "version": row.version},
    )
    return row


def create_draft_contract(
    db: Session,
    org_id: str,
    *,
    title: str | None = None,
    summary: str | None = None,
    spec: dict | None = None,
    actor: str | None = None,
) -> OutcomeContract:
    active = get_active_contract(db, org_id)
    base_spec = _default_spec()
    base_summary = DEFAULT_CONTRACT_SUMMARY
    base_title = DEFAULT_CONTRACT_TITLE
    if active:
        try:
            base_spec = json.loads(active.spec_json or "{}") or base_spec
        except json.JSONDecodeError:
            pass
        base_summary = active.summary
        base_title = active.title

    row = OutcomeContract(
        org_id=org_id,
        version=_next_version(db, org_id),
        status="draft",
        title=title or base_title,
        summary=summary or base_summary,
        spec_json=json.dumps(spec if spec is not None else base_spec),
        metric_version=metric_version(),
        created_by=actor,
    )
    db.add(row)
    db.flush()
    _log_change(
        db,
        org_id=org_id,
        contract_id=row.id,
        action="draft_created",
        actor=actor,
        detail={"fromVersion": active.version if active else None},
    )
    return row


def publish_contract(
    db: Session,
    org_id: str,
    contract_id: str,
    *,
    actor: str | None = None,
) -> OutcomeContract:
    row = (
        db.query(OutcomeContract)
        .filter(
            OutcomeContract.id == contract_id,
            OutcomeContract.org_id == org_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Contract not found")
    if row.status != "draft":
        raise ValueError("Only draft contracts can be published")
    return _publish_contract(db, row, actor=actor or "api")


def approve_contract(
    db: Session,
    org_id: str,
    contract_id: str,
    *,
    signer_name: str,
    signer_email: str | None = None,
    signer_title: str | None = None,
    attestation_text: str | None = None,
    actor: str | None = None,
) -> OutcomeContractApproval:
    row = (
        db.query(OutcomeContract)
        .filter(
            OutcomeContract.id == contract_id,
            OutcomeContract.org_id == org_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Contract not found")
    if row.status != "active":
        raise ValueError("Only active contracts can receive CFO approval")

    existing = _approval_for_contract(db, contract_id)
    if existing:
        raise ValueError("Contract already approved")

    approval = OutcomeContractApproval(
        org_id=org_id,
        contract_id=contract_id,
        signer_name=signer_name.strip(),
        signer_email=(signer_email or "").strip() or None,
        signer_title=(signer_title or "").strip() or None,
        attestation_text=(attestation_text or DEFAULT_ATTESTATION).strip(),
    )
    db.add(approval)
    db.flush()
    _log_change(
        db,
        org_id=org_id,
        contract_id=contract_id,
        action="cfo_approved",
        actor=actor or signer_name,
        detail={
            "signerEmail": approval.signer_email,
            "signerTitle": approval.signer_title,
        },
    )
    return approval


def list_contract_versions(db: Session, org_id: str) -> list[dict]:
    rows = (
        db.query(OutcomeContract)
        .filter(OutcomeContract.org_id == org_id)
        .order_by(OutcomeContract.created_at.desc())
        .all()
    )
    return [
        contract_to_dict(r, approval=_approval_for_contract(db, r.id)) for r in rows
    ]


def list_contract_audit(db: Session, org_id: str, *, limit: int = 50) -> list[dict]:
    rows = (
        db.query(OutcomeContractChange)
        .filter(OutcomeContractChange.org_id == org_id)
        .order_by(OutcomeContractChange.created_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in rows:
        detail = {}
        if r.detail_json:
            try:
                detail = json.loads(r.detail_json)
            except json.JSONDecodeError:
                detail = {}
        out.append(
            {
                "id": r.id,
                "contractId": r.contract_id,
                "action": r.action,
                "actor": r.actor,
                "detail": detail,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
        )
    return out


def win_definition_from_contract(db: Session, org_id: str) -> str:
    """Prefer active contract summary for wins/exports."""
    ensure_default_contract(db, org_id)
    active = get_active_contract(db, org_id)
    if active and active.summary:
        return active.summary.strip()
    return os.getenv("OUTCOME_WIN_DEFINITION", DEFAULT_CONTRACT_SUMMARY)
