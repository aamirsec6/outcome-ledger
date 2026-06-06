"""Attribution review inbox summary."""

from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.attribution_engine import list_link_candidates
from app.models import AttributionLink


def count_pending_reviews(db: Session, org_id: str, *, max_confidence: float = 0.65) -> int:
    return (
        db.query(AttributionLink)
        .filter(
            AttributionLink.org_id == org_id,
            AttributionLink.is_manual_override.is_(False),
            AttributionLink.confidence <= max_confidence,
        )
        .count()
    )


def build_inbox_summary(db: Session, org_id: str) -> dict:
    pending = count_pending_reviews(db, org_id)
    dashboard = (os.getenv("DASHBOARD_URL") or "http://localhost:3001").rstrip("/")
    return {
        "pendingCount": pending,
        "needsReview": pending > 0,
        "reviewUrl": f"{dashboard}/overview#attribution-inbox",
        "topCandidates": list_link_candidates(db, org_id, limit=3),
    }
