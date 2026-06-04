from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

DEFAULT_DELAYS = (0, 5, 30, 120)


def with_retry(
    fn: Callable[[], T],
    *,
    delays: tuple[int, ...] = DEFAULT_DELAYS,
    on_error: Callable[[Exception, int], None] | None = None,
) -> T:
    last: Exception | None = None
    for attempt, delay in enumerate(delays):
        if delay > 0:
            time.sleep(delay)
        try:
            return fn()
        except Exception as exc:
            last = exc
            if on_error:
                on_error(exc, attempt)
    assert last is not None
    raise last
