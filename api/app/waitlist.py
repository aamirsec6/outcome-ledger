from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import WaitlistPageView, WaitlistSignup

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def waitlist_cap() -> int:
    raw = (os.getenv("WAITLIST_CAP") or "50").strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return 50


def public_waitlist_stats(db: Session) -> dict:
    count = db.query(WaitlistSignup).count()
    cap = waitlist_cap()
    remaining = max(0, cap - count)
    return {
        "signups": count,
        "cap": cap,
        "spotsRemaining": remaining,
        "percentFull": min(100, round(count / cap * 100)) if cap else 0,
        "isOpen": count < cap,
    }


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def record_page_view(
    db: Session,
    *,
    session_id: str,
    path: str,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    ref: str | None = None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> dict:
    ip_hash = None
    if ip:
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    row = WaitlistPageView(
        session_id=session_id[:64],
        path=path[:256],
        utm_source=(utm_source or "")[:128] or None,
        utm_medium=(utm_medium or "")[:128] or None,
        utm_campaign=(utm_campaign or "")[:128] or None,
        utm_content=(utm_content or "")[:128] or None,
        ref=(ref or "")[:128] or None,
        user_agent=(user_agent or "")[:512] or None,
        ip_hash=ip_hash,
    )
    db.add(row)
    db.flush()
    return {"recorded": True, "viewId": row.id}


def create_signup(
    db: Session,
    *,
    email: str,
    name: str | None,
    role: str | None,
    company: str | None,
    solutions: list[str],
    other_solution: str | None,
    session_id: str | None,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    ref: str | None = None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> dict:
    normalized = _normalize_email(email)
    if not _EMAIL_RE.match(normalized):
        return {"ok": False, "error": "invalid_email"}

    stats = public_waitlist_stats(db)
    if not stats["isOpen"]:
        return {"ok": False, "error": "waitlist_full", "stats": stats}

    existing = (
        db.query(WaitlistSignup).filter(WaitlistSignup.email == normalized).first()
    )
    if existing:
        return {
            "ok": True,
            "alreadyRegistered": True,
            "signupId": existing.id,
            "stats": public_waitlist_stats(db),
        }

    ip_hash = None
    if ip:
        ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]

    row = WaitlistSignup(
        email=normalized,
        name=(name or "").strip()[:128] or None,
        role=(role or "").strip()[:64] or None,
        company=(company or "").strip()[:128] or None,
        solutions_json=json.dumps(solutions[:12]),
        other_solution=(other_solution or "").strip()[:512] or None,
        session_id=(session_id or "")[:64] or None,
        utm_source=(utm_source or "")[:128] or None,
        utm_medium=(utm_medium or "")[:128] or None,
        utm_campaign=(utm_campaign or "")[:128] or None,
        utm_content=(utm_content or "")[:128] or None,
        ref=(ref or "")[:128] or None,
        user_agent=(user_agent or "")[:512] or None,
        ip_hash=ip_hash,
    )
    db.add(row)
    db.flush()
    return {
        "ok": True,
        "alreadyRegistered": False,
        "signupId": row.id,
        "stats": public_waitlist_stats(db),
    }


def list_signups(db: Session, *, limit: int = 500) -> list[dict]:
    rows = (
        db.query(WaitlistSignup)
        .order_by(WaitlistSignup.created_at.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in rows:
        try:
            solutions = json.loads(r.solutions_json or "[]")
        except json.JSONDecodeError:
            solutions = []
        out.append(
            {
                "id": r.id,
                "email": r.email,
                "name": r.name,
                "role": r.role,
                "company": r.company,
                "solutions": solutions,
                "otherSolution": r.other_solution,
                "utmSource": r.utm_source,
                "utmMedium": r.utm_medium,
                "utmCampaign": r.utm_campaign,
                "utmContent": r.utm_content,
                "ref": r.ref,
                "sessionId": r.session_id,
                "createdAt": r.created_at.isoformat(),
            }
        )
    return out
