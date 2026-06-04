from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

_SOLUTION_LABELS = {
    "cpst": "CPST — cost per merged PR that stuck",
    "finance": "Prove AI coding ROI to finance / board",
    "attribution": "Attribute OpenAI + Anthropic + Cursor spend to teams",
    "contracts": "CFO-signable outcome definitions",
    "exports": "Board-ready PDF with methodology appendix",
    "failure": "Failure cost share (reverts, pending stability)",
}


def _resend_configured() -> bool:
    return bool((os.getenv("RESEND_API_KEY") or "").strip())


def _notify_emails() -> list[str]:
    raw = (os.getenv("WAITLIST_NOTIFY_EMAILS") or os.getenv("WAITLIST_NOTIFY_EMAIL") or "").strip()
    if not raw:
        return []
    return [e.strip() for e in raw.split(",") if e.strip()]


def _from_email() -> str:
    return (
        os.getenv("WAITLIST_FROM_EMAIL")
        or os.getenv("RESEND_FROM_EMAIL")
        or "onboarding@resend.dev"
    ).strip()


def _dashboard_url() -> str:
    return (os.getenv("DASHBOARD_URL") or "http://localhost:3001").rstrip("/")


def _send_resend(*, to: list[str], subject: str, html: str, text: str) -> bool:
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    if not api_key or not to:
        return False
    try:
        with httpx.Client(timeout=15.0) as client:
            res = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": _from_email(),
                    "to": to,
                    "subject": subject,
                    "html": html,
                    "text": text,
                },
            )
        if res.status_code >= 400:
            logger.warning("Resend failed status=%s body=%s", res.status_code, res.text[:200])
            return False
        return True
    except Exception:
        logger.exception("Resend request failed")
        return False


def notify_admin_new_signup(
    *,
    email: str,
    name: str | None,
    role: str | None,
    company: str | None,
    solutions: list[str],
    other_solution: str | None,
    utm_source: str | None,
    utm_campaign: str | None,
    ref: str | None,
    stats: dict,
) -> bool:
    recipients = _notify_emails()
    if not _resend_configured() or not recipients:
        return False

    labels = [_SOLUTION_LABELS.get(s, s) for s in solutions]
    solutions_block = "\n".join(f"  • {l}" for l in labels) if labels else "  (none)"
    if other_solution:
        solutions_block += f"\n  • Other: {other_solution}"

    subject = f"[Waitlist] {email}" + (f" · {ref}" if ref else "")
    text = f"""New Outcome Ledger waitlist signup

Email: {email}
Name: {name or "—"}
Role: {role or "—"}
Company: {company or "—"}

Solutions needed:
{solutions_block}

Attribution:
  ref: {ref or "—"}
  utm_source: {utm_source or "—"}
  utm_campaign: {utm_campaign or "—"}

Cohort: {stats.get("signups")}/{stats.get("cap")} ({stats.get("spotsRemaining")} spots left)
"""
    html = f"""<pre style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.5">{text}</pre>"""
    return _send_resend(to=recipients, subject=subject, html=html, text=text)


def send_welcome_email(*, email: str, name: str | None, spots_remaining: int) -> bool:
    if (os.getenv("WAITLIST_WELCOME_EMAIL") or "").strip().lower() not in (
        "1",
        "true",
        "yes",
    ):
        return False
    if not _resend_configured():
        return False

    greeting = f"Hi {name}," if name else "Hi,"
    join_url = f"{_dashboard_url()}/join"
    text = f"""{greeting}

You're on the Outcome Ledger design partner waitlist.

We're building CPST — cost per accepted outcome for AI-assisted engineering (spend tied to stable merged wins, not token vanity metrics).

{spots_remaining} spots remain in this cohort. We'll reach out when we open your slot.

— Outcome Ledger
{join_url}
"""
    html = f"""
<p>{greeting}</p>
<p>You're on the <strong>Outcome Ledger</strong> design partner waitlist.</p>
<p>We're building <strong>CPST</strong> — cost per accepted outcome for AI-assisted engineering (spend tied to stable merged wins, not token vanity metrics).</p>
<p><strong>{spots_remaining}</strong> spots remain in this cohort. We'll reach out when we open your slot.</p>
<p>— Outcome Ledger</p>
"""
    return _send_resend(
        to=[email],
        subject="You're on the Outcome Ledger waitlist",
        html=html,
        text=text,
    )


def handle_signup_notifications(
    *,
    email: str,
    name: str | None,
    role: str | None,
    company: str | None,
    solutions: list[str],
    other_solution: str | None,
    utm_source: str | None,
    utm_campaign: str | None,
    ref: str | None,
    already_registered: bool,
    stats: dict,
) -> None:
    if already_registered:
        return
    notify_admin_new_signup(
        email=email,
        name=name,
        role=role,
        company=company,
        solutions=solutions,
        other_solution=other_solution,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        ref=ref,
        stats=stats,
    )
    send_welcome_email(
        email=email,
        name=name,
        spots_remaining=int(stats.get("spotsRemaining") or 0),
    )
