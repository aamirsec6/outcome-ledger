from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(256), default="Default org")
    win_definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ProviderConnection(Base):
    """OAuth / connect credentials per org (server-side only)."""

    __tablename__ = "provider_connections"
    __table_args__ = (
        UniqueConstraint("org_id", "provider", name="uq_org_provider"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    external_login: Mapped[str | None] = mapped_column(String(128), nullable=True)
    scopes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    repos_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class UsageEvent(Base):
    __tablename__ = "usage_events"
    __table_args__ = (UniqueConstraint("org_id", "external_id", name="uq_usage_external"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    external_id: Mapped[str] = mapped_column(String(128))
    source: Mapped[str] = mapped_column(String(32), index=True)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    input_tokens: Mapped[int] = mapped_column(default=0)
    output_tokens: Mapped[int] = mapped_column(default=0)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    team_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    repo: Mapped[str | None] = mapped_column(String(256), nullable=True)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class TeamMapping(Base):
    """Map repos or sources to internal team ids for attribution."""

    __tablename__ = "team_mappings"
    __table_args__ = (UniqueConstraint("org_id", "pattern", name="uq_team_pattern"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    pattern: Mapped[str] = mapped_column(String(256))
    team_id: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class SyncRun(Base):
    """Audit trail for ingest / sync jobs."""

    __tablename__ = "sync_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    trigger: Mapped[str] = mapped_column(String(32), default="manual")
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    results_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class OutcomeEvent(Base):
    __tablename__ = "outcome_events"
    __table_args__ = (UniqueConstraint("org_id", "external_id", name="uq_outcome_external"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    external_id: Mapped[str] = mapped_column(String(128))
    outcome_type: Mapped[str] = mapped_column(String(64), default="pr_merged_stable")
    accepted: Mapped[bool] = mapped_column(Boolean, default=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    team_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    repo: Mapped[str] = mapped_column(String(256))
    pr_number: Mapped[int | None] = mapped_column(nullable=True)
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    reverted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OutcomeContract(Base):
    """Versioned definition of what counts as an accepted outcome (moat: ontology)."""

    __tablename__ = "outcome_contracts"
    __table_args__ = (UniqueConstraint("org_id", "version", name="uq_org_contract_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    version: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True)
    title: Mapped[str] = mapped_column(String(256))
    summary: Mapped[str] = mapped_column(Text)
    spec_json: Mapped[str] = mapped_column(Text)
    metric_version: Mapped[str] = mapped_column(String(16), default="1.0")
    created_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    published_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    superseded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class OutcomeContractChange(Base):
    """Immutable audit trail when contracts change."""

    __tablename__ = "outcome_contract_changes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    contract_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(32))
    actor: Mapped[str | None] = mapped_column(String(128), nullable=True)
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OutcomeContractApproval(Base):
    """CFO / finance sign-off on an active contract version."""

    __tablename__ = "outcome_contract_approvals"
    __table_args__ = (UniqueConstraint("contract_id", name="uq_contract_approval"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    contract_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(32), default="cfo")
    signer_name: Mapped[str] = mapped_column(String(128))
    signer_email: Mapped[str | None] = mapped_column(String(256), nullable=True)
    signer_title: Mapped[str | None] = mapped_column(String(128), nullable=True)
    attestation_text: Mapped[str] = mapped_column(Text)
    signed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ReportRun(Base):
    """Executive narrative job — metrics JSON in, prose out; human approval gate."""

    __tablename__ = "report_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True)
    narrative: Mapped[str] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_row_count: Mapped[int] = mapped_column(default=0)
    metrics_json: Mapped[str] = mapped_column(Text)
    approved_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CpstSnapshot(Base):
    """Immutable CPST rollup per period — moat: years of comparable history."""

    __tablename__ = "cpst_snapshots"
    __table_args__ = (
        UniqueConstraint("org_id", "period_start", "grain", name="uq_cpst_period"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), index=True)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    grain: Mapped[str] = mapped_column(String(16), default="month")
    contract_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    contract_version: Mapped[str | None] = mapped_column(String(16), nullable=True)
    metric_version: Mapped[str] = mapped_column(String(16), default="1.0")
    total_spend_usd: Mapped[float] = mapped_column(Float, default=0.0)
    stable_outcomes: Mapped[int] = mapped_column(default=0)
    cpst_usd: Mapped[float] = mapped_column(Float, default=0.0)
    failure_cost_share: Mapped[float] = mapped_column(Float, default=0.0)
    attributed_pct: Mapped[float] = mapped_column(Float, default=0.0)
    teams_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
