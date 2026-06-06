"""Weekly digest email via Resend."""

from __future__ import annotations

import logging
import os

from app.notifications.content import build_digest_context
from app.waitlist_notify import _from_email, _send_resend

logger = logging.getLogger(__name__)


def _dashboard_url() -> str:
    return (os.getenv("DASHBOARD_URL") or "http://localhost:3001").rstrip("/")


def _fmt_usd(amount: float) -> str:
    return f"${amount:,.2f}"


def render_digest_html(ctx: dict) -> str:
    anomalies = ctx.get("anomalies") or []
    teams = ctx.get("teams") or []
    inbox = ctx.get("inbox") or {}
    anomaly_rows = "".join(
        f"<li>{a.get('message', 'Anomaly')}</li>" for a in anomalies
    ) or "<li>No CPST spikes this period</li>"
    team_rows = "".join(
        f"<li>{t.get('teamName') or t.get('teamId')}: "
        f"CPST {_fmt_usd(float(t.get('cpstUsd') or 0))} · "
        f"{int(t.get('acceptedOutcomes') or 0)} wins</li>"
        for t in teams
    ) or "<li>No team breakdown yet</li>"
    pending = int(inbox.get("pendingCount") or 0)
    inbox_line = (
        f"<p><strong>Attribution inbox:</strong> {pending} items need review — "
        f'<a href="{inbox.get("reviewUrl")}">Review now</a></p>'
        if pending > 0
        else "<p>Attribution inbox is clear.</p>"
    )
    return f"""<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#111;max-width:560px">
  <h2 style="margin:0 0 8px">Outcome Ledger weekly digest</h2>
  <p style="color:#555;margin:0 0 16px">{ctx.get('companyName')} · {ctx.get('generatedAt')}</p>
  <table cellpadding="8" style="border-collapse:collapse;width:100%;margin-bottom:16px">
    <tr style="background:#f4f4f5">
      <td><strong>Spend (period)</strong><br>{_fmt_usd(float(ctx.get('totalSpendUsd') or 0))}</td>
      <td><strong>Wins</strong><br>{int(ctx.get('stableOutcomes') or 0)}</td>
    </tr>
    <tr>
      <td><strong>CPST</strong><br>{_fmt_usd(float(ctx.get('orgCpstUsd') or 0))}</td>
      <td><strong>Attributed</strong><br>{float(ctx.get('attributedSpendPct') or 0):.0f}%</td>
    </tr>
    <tr style="background:#f4f4f5">
      <td colspan="2"><strong>Month-to-date spend</strong><br>{_fmt_usd(float(ctx.get('mtdSpendUsd') or 0))}</td>
    </tr>
  </table>
  <h3 style="margin:16px 0 8px">Alerts</h3>
  <ul>{anomaly_rows}</ul>
  <h3 style="margin:16px 0 8px">Top teams by CPST</h3>
  <ul>{team_rows}</ul>
  {inbox_line}
  <p style="margin-top:24px"><a href="{_dashboard_url()}/overview">Open dashboard</a></p>
</body></html>"""


def render_digest_text(ctx: dict) -> str:
    lines = [
        f"Outcome Ledger weekly digest — {ctx.get('companyName')}",
        ctx.get("generatedAt") or "",
        "",
        f"Spend: {_fmt_usd(float(ctx.get('totalSpendUsd') or 0))}",
        f"Wins: {int(ctx.get('stableOutcomes') or 0)}",
        f"CPST: {_fmt_usd(float(ctx.get('orgCpstUsd') or 0))}",
        f"Attributed: {float(ctx.get('attributedSpendPct') or 0):.0f}%",
        f"MTD spend: {_fmt_usd(float(ctx.get('mtdSpendUsd') or 0))}",
        "",
    ]
    for a in ctx.get("anomalies") or []:
        lines.append(f"Alert: {a.get('message')}")
    pending = int((ctx.get("inbox") or {}).get("pendingCount") or 0)
    if pending:
        lines.append(f"Inbox: {pending} items need review")
    lines.append(f"\nDashboard: {_dashboard_url()}/overview")
    return "\n".join(lines)


def send_weekly_digest(db, org_id: str, *, recipients: list[str], lookback_days: int = 90) -> dict:
    if not recipients:
        return {"ok": False, "error": "no recipients"}
    ctx = build_digest_context(db, org_id, lookback_days=lookback_days)
    subject = f"[Outcome Ledger] Weekly digest — {ctx['companyName']}"
    sent = _send_resend(
        to=recipients,
        subject=subject,
        html=render_digest_html(ctx),
        text=render_digest_text(ctx),
    )
    if not sent:
        return {"ok": False, "error": "email send failed — check RESEND_API_KEY"}
    return {"ok": True, "recipients": recipients, "companyName": ctx["companyName"]}
