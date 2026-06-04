from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import timedelta
from typing import Any

from outcome_ledger_mcp.config import AppConfig
from outcome_ledger_mcp.models import OutcomeEvent, UsageEvent


class BaseExtractor(ABC):
    source_id: str = "base"

    def __init__(self, config: AppConfig):
        self.config = config

    @abstractmethod
    def is_configured(self) -> bool:
        ...

    @abstractmethod
    def test_connection(self) -> dict[str, Any]:
        ...

    def fetch_usage(self, since: timedelta) -> list[UsageEvent]:
        return []

    def fetch_outcomes(self, since: timedelta) -> list[OutcomeEvent]:
        return []
