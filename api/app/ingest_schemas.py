from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

MAX_INGEST_BATCH = 500


class UsageEventIn(BaseModel):
    external_id: str | None = Field(default=None, max_length=128)
    event_id: str | None = Field(default=None, max_length=128)
    source: str = Field(max_length=32)
    user_email: str | None = Field(default=None, max_length=128)
    user_id: str | None = Field(default=None, max_length=128)
    cost_usd: float = Field(ge=0)
    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    model: str | None = Field(default=None, max_length=64)
    period_start: datetime
    period_end: datetime
    team_id: str | None = Field(default=None, max_length=64)
    repo: str | None = Field(default=None, max_length=256)
    metadata: dict | None = None

    def resolved_external_id(self) -> str:
        ext = (self.external_id or self.event_id or "").strip()
        if not ext:
            raise ValueError("external_id or event_id required")
        return ext[:128]

    def resolved_user_id(self) -> str | None:
        return (self.user_id or self.user_email or "").strip() or None


class OutcomeEventIn(BaseModel):
    external_id: str | None = Field(default=None, max_length=128)
    outcome_id: str | None = Field(default=None, max_length=128)
    source: str = Field(default="github", max_length=32)
    outcome_type: str = Field(default="pr_merged_stable", max_length=64)
    accepted: bool = True
    occurred_at: datetime
    repo: str = Field(max_length=256)
    pr_number: int | None = None
    author: str | None = Field(default=None, max_length=128)
    team_id: str | None = Field(default=None, max_length=64)
    metadata: dict | None = None

    def resolved_external_id(self) -> str:
        ext = (self.external_id or self.outcome_id or "").strip()
        if not ext:
            raise ValueError("external_id or outcome_id required")
        return ext[:128]


class UsageIngestRequest(BaseModel):
    events: list[UsageEventIn] = Field(default_factory=list, max_length=MAX_INGEST_BATCH)


class OutcomeIngestRequest(BaseModel):
    events: list[OutcomeEventIn] = Field(default_factory=list, max_length=MAX_INGEST_BATCH)
