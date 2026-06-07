from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

def _org_id_column(**kwargs: object):
    """FK to organizations — one object per column (SQLAlchemy requirement)."""
    return mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        **kwargs,
    )


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(256), default="Default org")
    profile_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    notifications_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    win_definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OrganizationClerkLink(Base):
    """Maps Clerk user/org to an Outcome Ledger workspace."""

    __tablename__ = "organization_clerk_links"
    __table_args__ = (UniqueConstraint("clerk_org_id", name="uq_clerk_org_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(unique=True, index=True)
    clerk_user_id: Mapped[str] = mapped_column(String(128), index=True)
    clerk_org_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OrganizationApiKey(Base):
    """Per-tenant dashboard / API access (prefix ol_)."""

    __tablename__ = "organization_api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    key_prefix: Mapped[str] = mapped_column(String(16))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(64), default="default")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ProviderConnection(Base):
    """OAuth / connect credentials per org (server-side only)."""

    __tablename__ = "provider_connections"
    __table_args__ = (
        UniqueConstraint("org_id", "provider", name="uq_org_provider"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    external_login: Mapped[str | None] = mapped_column(String(128), nullable=True)
    scopes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    repos_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class UsageEvent(Base):
    __tablename__ = "usage_events"
    __table_args__ = (UniqueConstraint("org_id", "external_id", name="uq_usage_external"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
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
    trace_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pr_number: Mapped[int | None] = mapped_column(nullable=True)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class TeamMapping(Base):
    """Map repos or sources to internal team ids for attribution."""

    __tablename__ = "team_mappings"
    __table_args__ = (UniqueConstraint("org_id", "pattern", name="uq_team_pattern"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    pattern: Mapped[str] = mapped_column(String(256))
    team_id: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class SyncRun(Base):
    """Audit trail for ingest / sync jobs."""

    __tablename__ = "sync_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
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
    org_id: Mapped[str] = _org_id_column(index=True)
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
    workflow_type: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    cost_comment_posted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AttributionLink(Base):
    """Persisted usage <-> outcome graph with proportional cost allocation."""

    __tablename__ = "attribution_links"
    __table_args__ = (
        UniqueConstraint(
            "org_id",
            "usage_event_id",
            "outcome_event_id",
            name="uq_attr_link",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    usage_event_id: Mapped[str] = mapped_column(String(36), index=True)
    outcome_event_id: Mapped[str] = mapped_column(String(36), index=True)
    allocated_usd: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    method: Mapped[str] = mapped_column(String(32), default="time_window")
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CommitAiMetrics(Base):
    """Per-commit AI vs human line counts (Cursor API or inferred)."""

    __tablename__ = "commit_ai_metrics"
    __table_args__ = (
        UniqueConstraint("org_id", "commit_hash", name="uq_commit_ai_metrics"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    commit_hash: Mapped[str] = mapped_column(String(64), index=True)
    repo: Mapped[str | None] = mapped_column(String(256), nullable=True)
    ai_lines_added: Mapped[int] = mapped_column(default=0)
    human_lines_added: Mapped[int] = mapped_column(default=0)
    total_lines_added: Mapped[int] = mapped_column(default=0)
    ai_pct: Mapped[float] = mapped_column(Float, default=0.0)
    source: Mapped[str] = mapped_column(String(32), default="cursor_api")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PrCodeAttribution(Base):
    """AI vs human code split rolled up to a merged PR / outcome."""

    __tablename__ = "pr_code_attribution"
    __table_args__ = (
        UniqueConstraint("org_id", "outcome_event_id", name="uq_pr_code_attr"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    outcome_event_id: Mapped[str] = mapped_column(String(36), index=True)
    ai_lines_added: Mapped[int] = mapped_column(default=0)
    human_lines_added: Mapped[int] = mapped_column(default=0)
    total_lines_added: Mapped[int] = mapped_column(default=0)
    ai_pct: Mapped[float] = mapped_column(Float, default=0.0)
    method: Mapped[str] = mapped_column(String(32), default="unavailable")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    commit_count: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class LinkerModel(Base):
    """Per-org logistic regression weights for learned attribution."""

    __tablename__ = "linker_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(unique=True, index=True)
    coefficients_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    intercept: Mapped[float] = mapped_column(Float, default=0.0)
    sample_count: Mapped[int] = mapped_column(default=0)
    trained_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BenchmarkContribution(Base):
    """Anonymized org benchmark row for network percentiles."""

    __tablename__ = "benchmark_contributions"
    __table_args__ = (
        UniqueConstraint("period", "anon_org_token", name="uq_bench_period_org"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    period: Mapped[str] = mapped_column(String(16), index=True)
    anon_org_token: Mapped[str] = mapped_column(String(16), index=True)
    vertical: Mapped[str] = mapped_column(String(64), default="engineering_saas", index=True)
    headcount_band: Mapped[str] = mapped_column(String(32), default="unknown")
    cpst_usd: Mapped[float] = mapped_column(Float, default=0.0)
    linked_spend_pct: Mapped[float] = mapped_column(Float, default=0.0)
    stable_outcomes: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OutcomeContract(Base):
    """Versioned definition of what counts as an accepted outcome (moat: ontology)."""

    __tablename__ = "outcome_contracts"
    __table_args__ = (UniqueConstraint("org_id", "version", name="uq_org_contract_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
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
    org_id: Mapped[str] = _org_id_column(index=True)
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
    org_id: Mapped[str] = _org_id_column(index=True)
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
    org_id: Mapped[str] = _org_id_column(index=True)
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


class WaitlistSignup(Base):
    """Public waitlist — attribution via UTM / ref for Reddit and campaigns."""

    __tablename__ = "waitlist_signups"
    __table_args__ = (UniqueConstraint("email", name="uq_waitlist_email"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(256), index=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    company: Mapped[str | None] = mapped_column(String(128), nullable=True)
    solutions_json: Mapped[str] = mapped_column(Text, default="[]")
    other_solution: Mapped[str | None] = mapped_column(String(512), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    utm_source: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    utm_medium: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ref: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class WaitlistPageView(Base):
    """Landing page views — track Reddit / campaign traffic before signup."""

    __tablename__ = "waitlist_page_views"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    path: Mapped[str] = mapped_column(String(256), default="/join")
    utm_source: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    utm_medium: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ref: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CpstSnapshot(Base):
    """Immutable CPST rollup per period — moat: years of comparable history."""

    __tablename__ = "cpst_snapshots"
    __table_args__ = (
        UniqueConstraint("org_id", "period_start", "grain", name="uq_cpst_period"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
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
    linked_spend_pct: Mapped[float] = mapped_column(Float, default=0.0)
    avg_link_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    workflow_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    teams_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ── Admin analytics: onboarding funnel, retention, dropoff ──────────────────


class OnboardingEvent(Base):
    """Track each step a user completes during onboarding."""

    __tablename__ = "onboarding_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(index=True)
    step: Mapped[str] = mapped_column(String(64), index=True)
    # e.g. signup, connect_github, connect_vendor, define_outcome, first_sync, first_dashboard, first_export
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class OrgHealthScore(Base):
    """Pre-computed retention/engagement score per org for the admin panel."""

    __tablename__ = "org_health_scores"
    __table_args__ = (UniqueConstraint("org_id", name="uq_health_org"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = _org_id_column(unique=True, index=True)
    onboarding_step: Mapped[str] = mapped_column(String(64), default="signup")
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    first_cpst_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_dashboard_view_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_export_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_count_30d: Mapped[int] = mapped_column(default=0)
    dashboard_views_30d: Mapped[int] = mapped_column(default=0)
    # Retention bucket: active, at_risk, dormant, churned
    retention_bucket: Mapped[str] = mapped_column(String(16), default="new", index=True)
    health_score: Mapped[int] = mapped_column(default=0)
    # 0-100: onboarding (30) + first_cpst (20) + sync_freq (20) + dashboard (15) + export (15)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
