from __future__ import annotations

import csv
import hashlib
import io
from datetime import datetime, timezone
from pathlib import Path

from outcome_ledger_mcp.models import UsageEvent


def parse_usage_csv(
    content: str,
    *,
    source: str,
    since: datetime,
    user_column: str | None = None,
) -> list[UsageEvent]:
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        return []
    events: list[UsageEvent] = []
    for row in reader:
        norm = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
        date_raw = norm.get("date") or norm.get("period") or norm.get("day")
        if not date_raw:
            continue
        try:
            day = datetime.strptime(date_raw[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if day < since:
            continue
        try:
            cost = float(norm.get("cost_usd") or norm.get("cost") or "0")
        except ValueError:
            continue
        if cost <= 0:
            continue
        user = None
        if user_column:
            user = norm.get(user_column.lower()) or norm.get(user_column)
        if not user:
            user = (
                norm.get("user_email")
                or norm.get("email")
                or norm.get("engineer_id")
                or norm.get("user")
            )
        team = norm.get("team_id") or "unassigned"
        ext = hashlib.sha256(
            f"{source}|{day.isoformat()}|{user or ''}|{team}|{cost}".encode()
        ).hexdigest()[:32]
        period_end = day.replace(hour=23, minute=59, second=59)
        events.append(
            UsageEvent(
                external_id=ext,
                source=source,
                cost_usd=cost,
                period_start=day,
                period_end=period_end,
                user_id=user,
                team_id=team,
                input_tokens=int(norm.get("input_tokens") or 0),
                output_tokens=int(norm.get("output_tokens") or 0),
                model=norm.get("model") or None,
            )
        )
    return events


def find_latest_csv(
    watch_paths: list[str],
    *,
    name_patterns: tuple[str, ...],
) -> Path | None:
    candidates: list[Path] = []
    for base in watch_paths:
        root = Path(base).expanduser()
        if not root.exists():
            continue
        for pat in name_patterns:
            candidates.extend(root.glob(pat))
            if root.is_dir():
                candidates.extend(root.rglob(pat))
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)
