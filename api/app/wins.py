from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import OutcomeEvent
from app.outcome_contracts import cpst_outcome_types, primary_win_type, win_definition_from_contract
from app.revert_check import stable_days

DEFAULT_WIN_DEFINITION = (
    "An accepted win is work that shipped to your codebase and stayed accepted: "
    "a merged pull request that was not reverted within the stability window. "
    "Each win is what engineering delivered — the PR title describes the change; "
    "map repos to teams so spend attaches to the squad that earned the win."
)


def win_definition_for_org(db: Session, org_id: str) -> str:
    return win_definition_from_contract(db, org_id)


def _classify_win(title: str, labels: list[str]) -> str:
    t = title.lower()
    label_text = " ".join(labels).lower()
    combined = f"{t} {label_text}"
    if any(k in combined for k in ("fix", "bug", "hotfix", "patch")):
        return "bugfix_shipped"
    if any(k in combined for k in ("feat", "feature", "add ", "implement")):
        return "feature_shipped"
    if any(k in combined for k in ("chore", "docs", "refactor", "test")):
        return "maintenance_shipped"
    return "change_shipped"


def _win_status(row: OutcomeEvent, now: datetime) -> str:
    if row.reverted:
        return "reverted"
    stable = timedelta(days=stable_days())
    if stable_days() > 0 and (now - row.occurred_at) < stable:
        return "pending_stable"
    if row.accepted:
        return "accepted"
    return "failed"


def _customer_win_line(title: str, win_type: str) -> str:
    """Plain-language line for execs: what got better."""
    t = (title or "Untitled change").strip()
    if win_type == "bugfix_shipped":
        return f"Fixed a customer-impacting issue: {t}"
    if win_type == "feature_shipped":
        return f"Shipped a product/engineering feature: {t}"
    if win_type == "maintenance_shipped":
        return f"Shipped internal quality work: {t}"
    return f"Shipped a merged change: {t}"


def outcome_to_win(row: OutcomeEvent, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    meta: dict = {}
    if row.raw_json:
        try:
            meta = json.loads(row.raw_json)
        except json.JSONDecodeError:
            meta = {}

    labels = meta.get("labels") or []
    if isinstance(labels, str):
        labels = [labels]

    title = row.title or meta.get("title") or "Untitled change"
    category = _classify_win(title, labels)
    status = _win_status(row, now)
    pr = row.pr_number
    repo = row.repo
    sha = meta.get("sha")
    github_url = meta.get("html_url") or (
        f"https://github.com/{repo}/pull/{pr}"
        if repo and pr
        else (f"https://github.com/{repo}/commit/{sha}" if repo and sha else None)
    )
    if row.outcome_type == "default_branch_commit":
        branch = meta.get("branch") or "default"
        win_summary = f"Shipped to {branch}: {title}"
    else:
        win_summary = _customer_win_line(title, category)

    return {
        "id": row.id,
        "externalId": row.external_id,
        "outcomeType": row.outcome_type,
        "status": status,
        "winType": category,
        "title": title,
        "winSummary": win_summary,
        "repo": repo,
        "prNumber": pr,
        "commitSha": sha,
        "teamId": row.team_id,
        "mergedAt": row.occurred_at.isoformat() if row.occurred_at else None,
        "githubUrl": github_url,
        "labels": labels,
        "author": meta.get("author"),
        "countsTowardCpst": status == "accepted",
    }


def list_wins(
    db: Session,
    org_id: str,
    *,
    lookback_days: int = 90,
    include_reverted: bool = True,
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    now = datetime.now(timezone.utc)

    types = cpst_outcome_types(db, org_id)
    rows = (
        db.query(OutcomeEvent)
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.occurred_at >= since,
            OutcomeEvent.outcome_type.in_(types),
        )
        .order_by(OutcomeEvent.occurred_at.desc())
        .all()
    )

    wins = []
    for row in rows:
        w = outcome_to_win(row, now)
        if not include_reverted and w["status"] == "reverted":
            continue
        wins.append(w)

    accepted = [w for w in wins if w["countsTowardCpst"]]
    pending = [w for w in wins if w["status"] == "pending_stable"]
    reverted = [w for w in wins if w["status"] == "reverted"]

    return {
        "winDefinition": win_definition_for_org(db, org_id),
        "winType": primary_win_type(db, org_id),
        "stableDays": stable_days(),
        "lookbackDays": lookback_days,
        "total": len(wins),
        "acceptedCount": len(accepted),
        "pendingCount": len(pending),
        "revertedCount": len(reverted),
        "wins": wins,
    }
