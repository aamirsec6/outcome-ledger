from __future__ import annotations

import os


def metric_version() -> str:
    return (os.getenv("CPST_METRIC_VERSION") or "1.0").strip()
