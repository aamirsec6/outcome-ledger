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


def _landing_url() -> str:
    return (
        os.getenv("LANDING_URL")
        or os.getenv("DASHBOARD_URL")
        or "http://localhost:3002"
    ).rstrip("/")


def email_config_status() -> dict:
    key = (os.getenv("RESEND_API_KEY") or "").strip()
    recipients = _notify_emails()
    from_addr = _from_email()
    welcome = (os.getenv("WAITLIST_WELCOME_EMAIL") or "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    return {
        "resendConfigured": bool(key),
        "fromEmail": from_addr,
        "notifyRecipients": recipients,
        "notifyCount": len(recipients),
        "welcomeEmailEnabled": welcome,
        "ready": bool(key and recipients),
    }


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
    rows = [
        ("Email", email),
        ("Name", name or "—"),
        ("Role", role or "—"),
        ("Company", company or "—"),
        ("Ref", ref or "—"),
        ("UTM source", utm_source or "—"),
        ("UTM campaign", utm_campaign or "—"),
        (
            "Cohort",
            f"{stats.get('signups')}/{stats.get('cap')} ({stats.get('spotsRemaining')} left)",
        ),
    ]
    row_html = "".join(
        f'<tr><td style="padding:8px 12px;color:#71717a;border-bottom:1px solid #27272a">{k}</td>'
        f'<td style="padding:8px 12px;color:#f4f4f5;border-bottom:1px solid #27272a">{v}</td></tr>'
        for k, v in rows
    )
    sol_html = "".join(f"<li style='margin:4px 0'>{l}</li>" for l in labels)
    if other_solution:
        sol_html += f"<li style='margin:4px 0'><em>Other:</em> {other_solution}</li>"
    html = f"""<!DOCTYPE html><html><body style="margin:0;background:#09090b;font-family:system-ui,sans-serif">
<div style="max-width:560px;margin:24px auto;padding:24px;background:#18181b;border-radius:12px;border:1px solid #27272a">
<p style="margin:0 0 16px;font-size:12px;color:#34d399;text-transform:uppercase;letter-spacing:.1em">New waitlist signup</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">{row_html}</table>
<p style="margin:20px 0 8px;font-size:12px;color:#71717a">Solutions needed</p>
<ul style="margin:0;padding-left:20px;color:#e4e4e7;font-size:14px">{sol_html or "<li>—</li>"}</ul>
</div></body></html>"""
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
    join_url = f"{_landing_url()}/join"
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


def send_test_notification() -> dict:
    """Send a test email to WAITLIST_NOTIFY_EMAILS — verify Resend wiring."""
    status = email_config_status()
    if not status["resendConfigured"]:
        return {"ok": False, "error": "RESEND_API_KEY not set"}
    if not status["notifyRecipients"]:
        return {"ok": False, "error": "WAITLIST_NOTIFY_EMAILS not set"}
    ok = _send_resend(
        to=status["notifyRecipients"],
        subject="[Outcome Ledger] Resend test — waitlist alerts are live",
        text="If you received this, Resend is configured correctly for Outcome Ledger waitlist notifications.",
        html="""<p style="font-family:system-ui,sans-serif">If you received this, <strong>Resend</strong> is configured correctly for Outcome Ledger waitlist notifications.</p>""",
    )
    return {"ok": ok, "sentTo": status["notifyRecipients"], "from": status["fromEmail"]}
