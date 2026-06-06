"""Slack incoming webhook delivery."""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)


def _dashboard_url() -> str:
    return (os.getenv("DASHBOARD_URL") or "http://localhost:3001").rstrip("/")


def _fmt_usd(amount: float) -> str:
    if amount >= 1_000_000:
        return f"${amount / 1_000_000:.2f}M"
    if amount >= 1_000:
        return f"${amount / 1_000:.1f}k"
    return f"${amount:.2f}"


def build_slack_blocks(
    *,
    company_name: str,
    overview: dict,
    alerts: list[dict],
    inbox: dict,
) -> list[dict]:
    blocks: list[dict] = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"Outcome Ledger · {company_name}"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Spend*\n{_fmt_usd(float(overview.get('totalSpendUsd') or 0))}"},
                {"type": "mrkdwn", "text": f"*Wins*\n{int(overview.get('stableOutcomes') or 0)}"},
                {"type": "mrkdwn", "text": f"*CPST*\n{_fmt_usd(float(overview.get('orgCpstUsd') or 0))}"},
                {
                    "type": "mrkdwn",
                    "text": f"*Attributed*\n{float(overview.get('attributedSpendPct') or 0):.0f}%",
                },
            ],
        },
    ]

    if alerts:
        lines = [f"• {a.get('message', 'Alert')}" for a in alerts[:5]]
        blocks.append(
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "*Alerts*\n" + "\n".join(lines)},
            }
        )

    pending = int(inbox.get("pendingCount") or 0)
    if pending > 0:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*Attribution inbox:* {pending} link"
                        f"{'s' if pending != 1 else ''} need review\n"
                        f"<{inbox.get('reviewUrl')}|Review in dashboard>"
                    ),
                },
            }
        )

    blocks.append(
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Open dashboard"},
                    "url": f"{_dashboard_url()}/overview",
                }
            ],
        }
    )
    return blocks


def post_slack_message(
    webhook_url: str,
    *,
    text: str,
    blocks: list[dict] | None = None,
) -> bool:
    if not webhook_url:
        return False
    payload: dict = {"text": text}
    if blocks:
        payload["blocks"] = blocks
    try:
        with httpx.Client(timeout=12.0) as client:
            res = client.post(webhook_url, json=payload)
        if res.status_code >= 400:
            logger.warning("Slack webhook failed status=%s body=%s", res.status_code, res.text[:200])
            return False
        return True
    except Exception:
        logger.exception("Slack webhook request failed")
        return False
