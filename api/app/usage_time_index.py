"""Time-sorted usage index for fast window queries (Phase 2)."""

from __future__ import annotations

import bisect
from datetime import datetime

from app.attribution import _as_utc
from app.models import UsageEvent


class UsageTimeIndex:
    """Binary-search usage events by period_start."""

    def __init__(self, events: list[UsageEvent]) -> None:
        self.events = sorted(events, key=lambda e: _as_utc(e.period_start))
        self.times = [_as_utc(e.period_start).timestamp() for e in self.events]

    def in_range(self, start: datetime, end: datetime) -> list[UsageEvent]:
        if not self.events:
            return []
        s = _as_utc(start).timestamp()
        e = _as_utc(end).timestamp()
        lo = bisect.bisect_left(self.times, s)
        hi = bisect.bisect_right(self.times, e)
        return self.events[lo:hi]
