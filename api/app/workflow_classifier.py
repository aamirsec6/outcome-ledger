"""Rules-based workflow classifier (Phase 1.5) — ML-ready labels on outcomes."""

from __future__ import annotations

import re
from typing import Literal

WorkflowType = Literal["feature", "bugfix", "refactor", "infra", "chore", "docs", "unknown"]

_LABEL_PATTERNS: list[tuple[WorkflowType, re.Pattern[str]]] = [
    ("bugfix", re.compile(r"\b(fix|bug|hotfix|patch|regression|defect)\b", re.I)),
    ("docs", re.compile(r"\b(doc|readme|changelog|comment)\b", re.I)),
    ("infra", re.compile(r"\b(ci|cd|docker|k8s|terraform|deploy|pipeline|railway)\b", re.I)),
    ("refactor", re.compile(r"\b(refactor|cleanup|rename|restructure|migrate)\b", re.I)),
    ("chore", re.compile(r"\b(chore|bump|deps|dependency|lint|format)\b", re.I)),
    ("feature", re.compile(r"\b(feat|feature|add|implement|introduce|support)\b", re.I)),
]

_PATH_HINTS: list[tuple[WorkflowType, re.Pattern[str]]] = [
    ("infra", re.compile(r"^(dockerfile|\.github/|railway|terraform/)", re.I)),
    ("docs", re.compile(r"^(docs/|README)", re.I)),
    ("chore", re.compile(r"^(package\.json|package-lock)", re.I)),
]


def classify_workflow(
    *,
    title: str | None = None,
    labels: list[str] | None = None,
    changed_paths: list[str] | None = None,
) -> WorkflowType:
    """Deterministic workflow tag from PR metadata (feeds CPST-by-workflow)."""
    text = (title or "").strip()
    labs = [l.lower() for l in (labels or [])]

    for lab in labs:
        if lab in ("bug", "bugfix", "fix"):
            return "bugfix"
        if lab in ("feature", "enhancement", "feat"):
            return "feature"
        if lab in ("chore", "dependencies"):
            return "chore"
        if lab in ("documentation", "docs"):
            return "docs"
        if lab in ("refactor",):
            return "refactor"
        if lab in ("ci", "build", "infra"):
            return "infra"

    for wf, pat in _LABEL_PATTERNS:
        if pat.search(text):
            return wf

    for path in changed_paths or []:
        p = path.replace("\\", "/")
        for wf, pat in _PATH_HINTS:
            if pat.search(p):
                return wf

    if text.startswith("Merge "):
        return "chore"
    return "unknown"


def label_outcome_workflows(db, org_id: str, *, limit: int = 2000) -> dict:
    """Backfill workflow_type on outcomes missing a label."""
    from app.models import OutcomeEvent

    rows = (
        db.query(OutcomeEvent)
        .filter(
            OutcomeEvent.org_id == org_id,
            OutcomeEvent.workflow_type.is_(None),
        )
        .limit(limit)
        .all()
    )
    updated = 0
    for row in rows:
        labels: list[str] = []
        paths: list[str] = []
        if row.raw_json:
            try:
                import json

                raw = json.loads(row.raw_json)
                labels = raw.get("labels") or []
                paths = raw.get("changed_paths") or raw.get("files") or []
            except json.JSONDecodeError:
                pass
        row.workflow_type = classify_workflow(
            title=row.title,
            labels=labels,
            changed_paths=paths,
        )
        updated += 1
    if updated:
        db.flush()
    return {"ok": True, "updated": updated}
