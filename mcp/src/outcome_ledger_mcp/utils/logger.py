from __future__ import annotations

import logging
import sys

LOG_FORMAT = "[%(asctime)s] %(levelname)s: %(message)s"


def setup_logging(verbose: bool = False) -> logging.Logger:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format=LOG_FORMAT, stream=sys.stderr)
    return logging.getLogger("outcome_ledger_mcp")
