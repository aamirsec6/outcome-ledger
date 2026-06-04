from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UsageEvent(BaseModel):
    external_id: str
    source: str
    cost_usd: float = Field(ge=0)
    period_start: datetime
    period_end: datetime
    input_tokens: int = 0
    output_tokens: int = 0
    model: str | None = None
    user_id: str | None = None
    team_id: str | None = None
    repo: str | None = None
    metadata: dict[str, Any] | None = None

    def to_ingest(self) -> dict:
        payload: dict[str, Any] = {
            "external_id": self.external_id,
            "source": self.source,
            "cost_usd": self.cost_usd,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
        }
        if self.model:
            payload["model"] = self.model
        if self.user_id:
            payload["user_id"] = self.user_id
        if self.team_id:
            payload["team_id"] = self.team_id
        if self.repo:
            payload["repo"] = self.repo
        if self.metadata:
            payload["metadata"] = self.metadata
        return payload


class OutcomeEvent(BaseModel):
    external_id: str
    source: str = "github"
    outcome_type: str = "pr_merged_stable"
    accepted: bool = True
    occurred_at: datetime
    repo: str
    pr_number: int | None = None
    author: str | None = None
    team_id: str | None = None
    metadata: dict[str, Any] | None = None

    def to_ingest(self) -> dict:
        meta = dict(self.metadata or {})
        if self.author:
            meta.setdefault("author", self.author)
        payload: dict[str, Any] = {
            "external_id": self.external_id,
            "source": self.source,
            "outcome_type": self.outcome_type,
            "accepted": self.accepted,
            "occurred_at": self.occurred_at.isoformat(),
            "repo": self.repo,
            "metadata": meta,
        }
        if self.pr_number is not None:
            payload["pr_number"] = self.pr_number
        if self.team_id:
            payload["team_id"] = self.team_id
        return payload
