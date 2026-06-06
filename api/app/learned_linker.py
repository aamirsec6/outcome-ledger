"""Phase 2 learned linker — logistic regression on attribution training pairs."""

from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.link_features import FEATURE_NAMES, extract_link_features, feature_vector
from app.models import AttributionLink, LinkerModel, OutcomeEvent, UsageEvent

logger = logging.getLogger(__name__)

MIN_TRAINING_SAMPLES = 8


def _try_sklearn():
    try:
        from sklearn.linear_model import LogisticRegression
        import numpy as np

        return LogisticRegression, np
    except ImportError:
        return None, None


def collect_training_pairs(db: Session, org_id: str) -> tuple[list[list[float]], list[int]]:
    """Positive: manual overrides + high-confidence links. Negative: random non-links."""
    positives: list[tuple[str, str]] = []
    for link in (
        db.query(AttributionLink)
        .filter(AttributionLink.org_id == org_id)
        .all()
    ):
        if link.is_manual_override or link.confidence >= 0.78:
            positives.append((link.usage_event_id, link.outcome_event_id))

    usage_rows = db.query(UsageEvent).filter(UsageEvent.org_id == org_id).limit(500).all()
    outcome_rows = (
        db.query(OutcomeEvent)
        .filter(OutcomeEvent.org_id == org_id, OutcomeEvent.accepted.is_(True))
        .limit(500)
        .all()
    )
    usage_map = {u.id: u for u in usage_rows}
    outcome_map = {o.id: o for o in outcome_rows}

    pos_set = set(positives)
    X: list[list[float]] = []
    y: list[int] = []

    for uid, oid in positives:
        u, o = usage_map.get(uid), outcome_map.get(oid)
        if u and o:
            X.append(feature_vector(extract_link_features(u, o)))
            y.append(1)

    neg_target = max(len(positives), 4)
    attempts = 0
    while len([v for v in y if v == 0]) < neg_target and attempts < neg_target * 20:
        attempts += 1
        u = random.choice(usage_rows)
        o = random.choice(outcome_rows)
        if (u.id, o.id) in pos_set:
            continue
        feats = extract_link_features(u, o)
        if feats["in_window"] and feats["repo_match"]:
            continue
        X.append(feature_vector(feats))
        y.append(0)

    return X, y


def train_linker_model(db: Session, org_id: str) -> dict:
    LogisticRegression, np = _try_sklearn()
    if LogisticRegression is None:
        return {"ok": False, "skipped": True, "reason": "scikit-learn not installed"}

    X, y = collect_training_pairs(db, org_id)
    if len(y) < MIN_TRAINING_SAMPLES or sum(y) < 2 or len(y) - sum(y) < 2:
        return {
            "ok": False,
            "skipped": True,
            "reason": "insufficient training pairs",
            "samples": len(y),
        }

    clf = LogisticRegression(max_iter=500, class_weight="balanced")
    clf.fit(np.array(X), np.array(y))

    row = (
        db.query(LinkerModel).filter(LinkerModel.org_id == org_id).first()
    )
    if not row:
        row = LinkerModel(org_id=org_id)
        db.add(row)
    row.coefficients_json = json.dumps(
        {name: float(c) for name, c in zip(FEATURE_NAMES, clf.coef_[0])}
    )
    row.intercept = float(clf.intercept_[0])
    row.sample_count = len(y)
    row.trained_at = datetime.now(timezone.utc)
    db.flush()
    return {
        "ok": True,
        "samples": len(y),
        "positives": sum(y),
        "coefficients": json.loads(row.coefficients_json),
    }


def link_probability(
    db: Session, org_id: str, usage: UsageEvent, outcome: OutcomeEvent
) -> float | None:
    """Return P(link) from trained model, or None if no model."""
    row = db.query(LinkerModel).filter(LinkerModel.org_id == org_id).first()
    if not row or not row.coefficients_json:
        return None
    try:
        coefs = json.loads(row.coefficients_json)
    except json.JSONDecodeError:
        return None
    feats = extract_link_features(usage, outcome)
    z = row.intercept
    for name in FEATURE_NAMES:
        z += coefs.get(name, 0.0) * feats[name]
    # logistic sigmoid
    import math

    return 1.0 / (1.0 + math.exp(-max(-20, min(20, z))))
