from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, RedirectResponse, Response
from pydantic import BaseModel

from app.db import get_db, init_db
from app.security import cors_origins, is_production, validate_startup_config
from app.tenant_auth import register_tenant, require_tenant_auth
from app.tenant_api_keys import (
    create_named_api_key,
    ensure_agent_api_key,
    list_org_api_keys,
    primary_workspace_key,
    reveal_workspace_api_key,
    rotate_agent_api_key,
)
from app.onboarding import build_onboarding_status
from app.org_credentials import connections_summary, save_connection
from app.github_app import app_configured, build_install_url, refresh_installation_repos
from app.github_oauth import (
    _dashboard_url,
    build_authorize_url,
    exchange_code,
    fetch_accessible_repos,
    fetch_github_user,
    get_github_connection,
    merge_repo_lists,
    parse_repos_json,
    save_github_connection,
    verify_oauth_state,
    verify_repo_access,
)
from app.github_status import combined_github_status
from app.github_webhooks import complete_app_install, handle_github_webhook, verify_webhook_signature
from app.ingest_csv import ingest_usage_csv
from app.ingest_push import (
    build_ingest_status,
    push_outcome_events,
    push_usage_events,
    record_mcp_sync,
    validate_batch_size,
)
from app.ingest_schemas import OutcomeIngestRequest, UsageIngestRequest
from app.ingest_github import ingest_github_merged_prs
from app.ingest_github_commits import ingest_github_default_branch_commits
from app.outcome_contracts import WIN_TYPE_COMMIT, primary_win_type
from app.cpst_history import list_cpst_history, record_cpst_snapshots
from app.constants import metric_version
from app.executive_reports import (
    approve_executive_report,
    create_executive_report,
    latest_executive_report,
)
from app.attribution_engine import (
    add_manual_override,
    list_link_candidates,
    rebuild_attribution_graph,
)
from app.benchmarks import build_benchmark_report
from app.metrics import build_attribution_breakdown, build_overview, ensure_default_org
from app.notification_settings import (
    get_notification_settings,
    settings_payload_for_api,
    update_notification_settings,
)
from app.notifications.delivery import (
    deliver_weekly_digest_all_orgs,
    deliver_weekly_digest_for_org,
    list_all_org_ids,
)
from app.notifications.inbox import build_inbox_summary
from app.org_profile import org_profile_payload, update_org_profile
from app.outcome_contracts import (
    _approval_for_contract,
    active_contract_payload,
    apply_win_settings,
    approve_contract,
    contract_to_dict,
    create_draft_contract,
    ensure_default_contract,
    get_win_settings,
    list_contract_audit,
    list_contract_versions,
    publish_contract,
)
from app.reports import export_cpst_csv
from app.reports_pdf import export_cpst_pdf
from app.revert_check import check_reverts
from app.sync_audit import sync_history
from app.sync_pipeline import run_full_sync
from app.team_mapping import list_team_mappings, replace_team_mappings
from app.waitlist import (
    create_signup,
    list_signups,
    public_waitlist_stats,
    record_page_view,
)
from app.waitlist_notify import (
    email_config_status,
    handle_signup_notifications,
    send_test_notification,
)
from app.wins import list_wins, win_definition_for_org

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    cfg = validate_startup_config()
    init_db()
    try:
        with get_db() as db:
            org_id = ensure_default_org(db)
            ensure_default_contract(db, org_id)
    except Exception:
        logger.warning("Startup org init failed — re-running migrations")
        init_db()
        with get_db() as db:
            org_id = ensure_default_org(db)
            ensure_default_contract(db, org_id)
    logger.info("Outcome Ledger API ready production=%s", cfg.get("production"))
    yield


app = FastAPI(
    title="Outcome Ledger API",
    description="Real ingest for AI spend + engineering outcomes (standalone)",
    version="0.2.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TenantRegisterPayload(BaseModel):
    name: str
    companyName: str | None = None


class ClerkSyncPayload(BaseModel):
    workspaceName: str | None = None
    companyName: str | None = None


class TenantApiKeyCreatePayload(BaseModel):
    name: str = "agent"


class OpenAIConnectionPayload(BaseModel):
    apiKey: str
    openaiOrgId: str | None = None
    projectId: str | None = None


class AnthropicConnectionPayload(BaseModel):
    apiKey: str


@app.post("/v1/tenants/register")
def tenants_register(payload: TenantRegisterPayload):
    """Create a new workspace + tenant API key (shown once)."""
    enabled = (os.getenv("TENANT_REGISTRATION_ENABLED") or "true").strip().lower()
    if enabled in ("0", "false", "no"):
        raise HTTPException(status_code=403, detail="Tenant registration disabled")
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Workspace name is required")
    with get_db() as db:
        return register_tenant(
            db, name=name, company_name=payload.companyName
        )


@app.post("/v1/tenants/clerk-sync", dependencies=[Depends(require_tenant_auth)])
def tenants_clerk_sync(payload: ClerkSyncPayload):
    """Ensure Clerk identity has a workspace; optional profile hints."""
    from app.models import Organization, OrganizationClerkLink

    with get_db() as db:
        org_id = ensure_default_org(db)
        link = (
            db.query(OrganizationClerkLink)
            .filter(OrganizationClerkLink.org_id == org_id)
            .first()
        )
        if payload.companyName and link:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org and not org.profile_json:
                import json

                org.profile_json = json.dumps(
                    {"companyName": payload.companyName.strip()}
                )
        return {
            "ok": True,
            "orgId": org_id,
            "clerkUserId": link.clerk_user_id if link else None,
            "clerkOrgId": link.clerk_org_id if link else None,
        }


@app.get("/v1/tenants/me", dependencies=[Depends(require_tenant_auth)])
def tenants_me():
    with get_db() as db:
        org_id = ensure_default_org(db)
        from app.models import Organization, OrganizationClerkLink

        org = db.query(Organization).filter(Organization.id == org_id).first()
        link = (
            db.query(OrganizationClerkLink)
            .filter(OrganizationClerkLink.org_id == org_id)
            .first()
        )
        profile = org_profile_payload(db, org_id)
        return {
            "orgId": org_id,
            "name": org.name if org else "Workspace",
            "profile": profile,
            "connections": connections_summary(db, org_id),
            "clerk": {
                "userId": link.clerk_user_id if link else None,
                "orgId": link.clerk_org_id if link else None,
            },
        }


@app.get("/v1/tenants/api-keys", dependencies=[Depends(require_tenant_auth)])
def tenants_list_api_keys():
    with get_db() as db:
        org_id = ensure_default_org(db)
        primary = primary_workspace_key(db, org_id)
        return {
            "keys": list_org_api_keys(db, org_id),
            "primaryKeyPrefix": primary["keyPrefix"] if primary else None,
            "primaryKeyName": primary["name"] if primary else None,
        }


@app.post("/v1/tenants/api-keys", dependencies=[Depends(require_tenant_auth)])
def tenants_create_api_key(payload: TenantApiKeyCreatePayload):
    name = (payload.name or "agent").strip()[:64] or "agent"
    with get_db() as db:
        org_id = ensure_default_org(db)
        if name == "agent":
            return ensure_agent_api_key(db, org_id)
        return create_named_api_key(db, org_id, name=name)


@app.post("/v1/tenants/api-keys/rotate", dependencies=[Depends(require_tenant_auth)])
def tenants_rotate_agent_api_key():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return rotate_agent_api_key(db, org_id)


@app.post("/v1/tenants/api-keys/reveal", dependencies=[Depends(require_tenant_auth)])
def tenants_reveal_api_key():
    """Create or rotate agent key and return full ol_* (shown once — client should save)."""
    with get_db() as db:
        org_id = ensure_default_org(db)
        return reveal_workspace_api_key(db, org_id)


@app.get("/v1/onboarding/status", dependencies=[Depends(require_tenant_auth)])
def onboarding_status():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return build_onboarding_status(db, org_id)


@app.put("/v1/connections/openai", dependencies=[Depends(require_tenant_auth)])
def connections_openai(payload: OpenAIConnectionPayload):
    key = (payload.apiKey or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="apiKey is required")
    with get_db() as db:
        org_id = ensure_default_org(db)
        save_connection(
            db,
            org_id=org_id,
            provider="openai",
            access_token=key,
            config={
                "openai_org_id": (payload.openaiOrgId or "").strip(),
                "project_id": (payload.projectId or "").strip(),
            },
        )
    return {"ok": True, "provider": "openai"}


@app.put("/v1/connections/anthropic", dependencies=[Depends(require_tenant_auth)])
def connections_anthropic(payload: AnthropicConnectionPayload):
    key = (payload.apiKey or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="apiKey is required")
    with get_db() as db:
        org_id = ensure_default_org(db)
        save_connection(
            db,
            org_id=org_id,
            provider="anthropic",
            access_token=key,
            config={},
        )
    return {"ok": True, "provider": "anthropic"}


@app.get("/health")
def health():
    from app.db import engine
    from app.schema_bootstrap import verify_schema

    schema = verify_schema(engine)
    return {
        "ok": schema.get("ok", True),
        "service": "outcome-ledger-api",
        "version": "0.2.1",
        "metricVersion": metric_version(),
        "stableDays": int(os.getenv("OUTCOME_STABLE_DAYS", "7")),
        "production": is_production(),
        "apiKeyRequired": is_production(),
        "database": schema,
    }


class WaitlistViewPayload(BaseModel):
    sessionId: str
    path: str = "/join"
    utmSource: str | None = None
    utmMedium: str | None = None
    utmCampaign: str | None = None
    utmContent: str | None = None
    ref: str | None = None
    website: str | None = None


class WaitlistSignupPayload(BaseModel):
    email: str
    name: str | None = None
    role: str | None = None
    company: str | None = None
    solutions: list[str] = []
    otherSolution: str | None = None
    sessionId: str | None = None
    utmSource: str | None = None
    utmMedium: str | None = None
    utmCampaign: str | None = None
    utmContent: str | None = None
    ref: str | None = None
    website: str | None = None


def _client_ip(request: Request) -> str | None:
    forwarded = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    if forwarded:
        return forwarded
    if request.client:
        return request.client.host
    return None


@app.get("/v1/waitlist/stats")
def waitlist_stats_public():
    with get_db() as db:
        return public_waitlist_stats(db)


@app.post("/v1/waitlist/view")
def waitlist_record_view(payload: WaitlistViewPayload, request: Request):
    if (payload.website or "").strip():
        return {"recorded": False, "reason": "honeypot"}
    with get_db() as db:
        return record_page_view(
            db,
            session_id=payload.sessionId,
            path=payload.path,
            utm_source=payload.utmSource,
            utm_medium=payload.utmMedium,
            utm_campaign=payload.utmCampaign,
            utm_content=payload.utmContent,
            ref=payload.ref,
            user_agent=request.headers.get("user-agent"),
            ip=_client_ip(request),
        )


@app.post("/v1/waitlist/signup")
def waitlist_signup(
    payload: WaitlistSignupPayload,
    request: Request,
    background_tasks: BackgroundTasks,
):
    if (payload.website or "").strip():
        raise HTTPException(status_code=400, detail="Invalid submission")
    with get_db() as db:
        result = create_signup(
            db,
            email=payload.email,
            name=payload.name,
            role=payload.role,
            company=payload.company,
            solutions=payload.solutions,
            other_solution=payload.otherSolution,
            session_id=payload.sessionId,
            utm_source=payload.utmSource,
            utm_medium=payload.utmMedium,
            utm_campaign=payload.utmCampaign,
            utm_content=payload.utmContent,
            ref=payload.ref,
            user_agent=request.headers.get("user-agent"),
            ip=_client_ip(request),
        )
    if not result.get("ok"):
        if result.get("error") == "invalid_email":
            raise HTTPException(status_code=400, detail="Invalid email")
        if result.get("error") == "waitlist_full":
            raise HTTPException(status_code=409, detail="Waitlist is full")
        raise HTTPException(status_code=400, detail="Signup failed")
    if result.get("ok") and not result.get("alreadyRegistered"):
        stats = result.get("stats") or {}
        background_tasks.add_task(
            handle_signup_notifications,
            email=payload.email.strip().lower(),
            name=payload.name,
            role=payload.role,
            company=payload.company,
            solutions=payload.solutions,
            other_solution=payload.otherSolution,
            utm_source=payload.utmSource,
            utm_campaign=payload.utmCampaign,
            ref=payload.ref,
            already_registered=False,
            stats=stats,
        )
    return result


@app.get("/v1/waitlist/signups", dependencies=[Depends(require_tenant_auth)])
def waitlist_list_signups():
    with get_db() as db:
        return {"signups": list_signups(db), "stats": public_waitlist_stats(db)}


@app.get("/v1/waitlist/email-status", dependencies=[Depends(require_tenant_auth)])
def waitlist_email_status():
    return email_config_status()


@app.post("/v1/waitlist/test-email", dependencies=[Depends(require_tenant_auth)])
def waitlist_test_email():
    result = send_test_notification()
    if not result.get("ok"):
        raise HTTPException(
            status_code=503,
            detail=result.get("error") or "Failed to send test email",
        )
    return result


def _require_cron_secret(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    expected = (os.getenv("CRON_SECRET") or "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")
    if not x_cron_secret or x_cron_secret.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid cron secret")


@app.post("/v1/ingest/usage", dependencies=[Depends(require_tenant_auth)])
def ingest_usage(body: UsageIngestRequest):
    """Batch usage events from local MCP agent (idempotent on external_id)."""
    validate_batch_size(len(body.events))
    with get_db() as db:
        org_id = ensure_default_org(db)
        result = push_usage_events(db, org_id=org_id, events=body.events)
    return {"status": "success", "ok": True, "orgId": org_id, **result}


@app.post("/v1/ingest/outcomes", dependencies=[Depends(require_tenant_auth)])
def ingest_outcomes(body: OutcomeIngestRequest):
    """Batch outcome events from local MCP agent."""
    validate_batch_size(len(body.events))
    with get_db() as db:
        org_id = ensure_default_org(db)
        result = push_outcome_events(db, org_id=org_id, events=body.events)
    return {"status": "success", "ok": True, "orgId": org_id, **result}


@app.post("/v1/ingest/sync-complete", dependencies=[Depends(require_tenant_auth)])
def ingest_sync_complete(body: dict | None = None):
    """Record MCP agent sync run after usage + outcome pushes."""
    payload = body or {}
    with get_db() as db:
        org_id = ensure_default_org(db)
        run_id = record_mcp_sync(
            db,
            org_id,
            usage_result=payload.get("usage") or {},
            outcome_result=payload.get("outcomes") or {},
        )
    return {"ok": True, "orgId": org_id, "syncRunId": run_id}


@app.get("/v1/ingest/status", dependencies=[Depends(require_tenant_auth)])
def ingest_status():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return build_ingest_status(db, org_id)


@app.post("/v1/sync", dependencies=[Depends(require_tenant_auth)])
def sync_all():
    """Pull vendors + GitHub, scan reverts, audit log."""
    with get_db() as db:
        org_id = ensure_default_org(db)
        results = run_full_sync(db, org_id, trigger="api")
    return {"ok": True, "org_id": org_id, "results": results}


@app.post("/v1/cron/sync", dependencies=[Depends(_require_cron_secret)])
def cron_sync():
    """Daily ingest — set Railway cron to POST with X-Cron-Secret."""
    with get_db() as db:
        org_id = ensure_default_org(db)
        results = run_full_sync(db, org_id, trigger="cron")
    return {"ok": True, "org_id": org_id, "results": results}


@app.post("/v1/cron/sync-all", dependencies=[Depends(_require_cron_secret)])
def cron_sync_all():
    """Daily ingest for every workspace — preferred multi-tenant cron."""
    org_results = []
    with get_db() as db:
        org_ids = list_all_org_ids(db)
        for org_id in org_ids:
            try:
                results = run_full_sync(db, org_id, trigger="cron")
                org_results.append({"orgId": org_id, "ok": results.get("ok"), "results": results})
            except Exception as exc:
                logging.getLogger(__name__).exception("cron sync failed org=%s", org_id)
                org_results.append({"orgId": org_id, "ok": False, "error": str(exc)})
    return {"ok": True, "orgs": org_results}


@app.post("/v1/cron/weekly-digest", dependencies=[Depends(_require_cron_secret)])
def cron_weekly_digest(force: bool = False):
    """Monday weekly email digest — Railway cron: Mon 08:00 UTC. ?force=true to test."""
    from datetime import datetime, timezone

    if not force and datetime.now(timezone.utc).weekday() != 0:
        return {"ok": True, "skipped": "not Monday — pass ?force=true to override"}
    with get_db() as db:
        return deliver_weekly_digest_all_orgs(db)


@app.post("/v1/jobs/check-reverts", dependencies=[Depends(require_tenant_auth)])
def job_check_reverts():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return check_reverts(db, org_id)


@app.get("/v1/jobs/openai-probe", dependencies=[Depends(require_tenant_auth)])
def job_openai_probe():
    """Check if the current OpenAI key can read billing (service account vs admin)."""
    from app.ingest_openai import probe_openai_access

    with get_db() as db:
        org_id = ensure_default_org(db)
        return probe_openai_access(db, org_id)


@app.post("/v1/jobs/test-openai", dependencies=[Depends(require_tenant_auth)])
def job_test_openai():
    """Pull OpenAI org costs — verify OPENAI_API_KEY + OPENAI_PROJECT_ID."""
    from app.ingest_openai import ingest_openai_costs

    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        result = ingest_openai_costs(db, org_id=org_id, lookback_days=lookback)
    if not result.get("ok") and result.get("probe"):
        result["hint"] = "See GET /v1/jobs/openai-probe or docs/openai-setup.md"
    return result


@app.post("/v1/imports/usage-csv", dependencies=[Depends(require_tenant_auth)])
async def import_usage_csv(
    file: UploadFile = File(...),
    source: str = "csv",
):
    content = await file.read()
    with get_db() as db:
        org_id = ensure_default_org(db)
        result = ingest_usage_csv(db, org_id=org_id, content=content, source=source)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result)
    return result


@app.get("/v1/metrics/overview", dependencies=[Depends(require_tenant_auth)])
def metrics_overview():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        overview = build_overview(db, org_id, lookback_days=lookback)
        overview["winDefinition"] = win_definition_for_org(db, org_id)
        return overview


@app.get("/v1/wins", dependencies=[Depends(require_tenant_auth)])
def wins_list():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return list_wins(db, org_id, lookback_days=lookback)


@app.get("/v1/integrations/status", dependencies=[Depends(require_tenant_auth)])
def integrations_status():
    with get_db() as db:
        org_id = ensure_default_org(db)
        overview = build_overview(db, org_id)
    return {"integrations": overview["integrations"]}


@app.get("/v1/settings/vendors", dependencies=[Depends(require_tenant_auth)])
def settings_vendors():
    from app.metrics import _vendor_configured

    with get_db() as db:
        org_id = ensure_default_org(db)
        return {
            "openai": {"configured": _vendor_configured("openai", db, org_id)},
            "anthropic": {"configured": _vendor_configured("anthropic", db, org_id)},
            "githubOAuth": bool(
                (os.getenv("GITHUB_OAUTH_CLIENT_ID") or "").strip()
                and (os.getenv("GITHUB_OAUTH_CLIENT_SECRET") or "").strip()
            ),
            "connections": connections_summary(db, org_id),
        }


@app.get("/v1/settings/outcome-win", dependencies=[Depends(require_tenant_auth)])
def get_outcome_win_settings():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return get_win_settings(db, org_id)


class OutcomeWinPayload(BaseModel):
    winType: str
    actor: str | None = None


@app.put("/v1/settings/outcome-win", dependencies=[Depends(require_tenant_auth)])
def put_outcome_win_settings(payload: OutcomeWinPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        try:
            apply_win_settings(
                db,
                org_id,
                win_type=payload.winType,
                actor=payload.actor or "settings",
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        settings = get_win_settings(db, org_id)
    return {"ok": True, **settings}


class OrgProfilePayload(BaseModel):
    companyName: str = ""
    legalName: str = ""
    tagline: str = ""
    stage: str = ""
    industry: str = ""
    website: str = ""
    headquarters: str = ""


@app.get("/v1/settings/org-profile", dependencies=[Depends(require_tenant_auth)])
def get_org_profile():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"profile": org_profile_payload(db, org_id)}


@app.put("/v1/settings/org-profile", dependencies=[Depends(require_tenant_auth)])
def put_org_profile(payload: OrgProfilePayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        profile = update_org_profile(db, org_id, payload.model_dump())
    return {"ok": True, "profile": profile}


class NotificationSettingsPayload(BaseModel):
    slackWebhookUrl: str = ""
    slackAlertsEnabled: bool = False
    digestEmails: list[str] | str = []
    digestEnabled: bool = False
    monthlyBudgetUsd: float = 0.0
    budgetAlertThresholdPct: float = 80.0
    githubPrCommentsEnabled: bool = False
    alertOnCpstSpike: bool = True
    alertOnBudgetBurn: bool = True
    alertOnInbox: bool = True


@app.get("/v1/settings/notifications", dependencies=[Depends(require_tenant_auth)])
def get_notifications_settings():
    with get_db() as db:
        org_id = ensure_default_org(db)
        settings = get_notification_settings(db, org_id)
    return {"settings": settings_payload_for_api(settings)}


@app.put("/v1/settings/notifications", dependencies=[Depends(require_tenant_auth)])
def put_notifications_settings(payload: NotificationSettingsPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        settings = update_notification_settings(db, org_id, payload.model_dump())
    return {"ok": True, "settings": settings_payload_for_api(settings)}


@app.post("/v1/notifications/test-slack", dependencies=[Depends(require_tenant_auth)])
def test_slack_notification():
    from app.notifications.slack import build_slack_blocks, post_slack_message

    with get_db() as db:
        org_id = ensure_default_org(db)
        settings = get_notification_settings(db, org_id)
        webhook = (settings.get("slackWebhookUrl") or "").strip()
        if not webhook:
            raise HTTPException(status_code=400, detail="Slack webhook URL not configured")
        profile = org_profile_payload(db, org_id)
        overview = build_overview(db, org_id)
        inbox = build_inbox_summary(db, org_id)
        company = profile.get("companyName") or "Your organization"
        ok = post_slack_message(
            webhook,
            text=f"Outcome Ledger test alert for {company}",
            blocks=build_slack_blocks(
                company_name=company,
                overview=overview,
                alerts=[
                    {
                        "message": "Test alert — Slack integration is working.",
                        "severity": "good",
                    }
                ],
                inbox=inbox,
            ),
        )
    if not ok:
        raise HTTPException(status_code=502, detail="Slack webhook delivery failed")
    return {"ok": True}


@app.post("/v1/notifications/test-digest", dependencies=[Depends(require_tenant_auth)])
def test_weekly_digest():
    from app.notifications.email import send_weekly_digest

    with get_db() as db:
        org_id = ensure_default_org(db)
        settings = get_notification_settings(db, org_id)
        recipients = settings.get("digestEmails") or []
        if not recipients:
            raise HTTPException(status_code=400, detail="Add digestEmails in notification settings")
        result = send_weekly_digest(db, org_id, recipients=recipients)
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result.get("error", "digest failed"))
    return result


@app.get("/v1/settings/team-mappings", dependencies=[Depends(require_tenant_auth)])
def get_team_mappings():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"mappings": list_team_mappings(db, org_id)}


class TeamMappingsPayload(BaseModel):
    mappings: list[dict]


@app.put("/v1/settings/team-mappings", dependencies=[Depends(require_tenant_auth)])
def put_team_mappings(payload: TeamMappingsPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        saved = replace_team_mappings(db, org_id, payload.mappings)
    return {"ok": True, "mappings": saved}


@app.get("/v1/sync/history", dependencies=[Depends(require_tenant_auth)])
def get_sync_history():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"runs": sync_history(db, org_id)}


@app.get("/v1/contracts/active", dependencies=[Depends(require_tenant_auth)])
def contracts_active():
    with get_db() as db:
        org_id = ensure_default_org(db)
        ensure_default_contract(db, org_id)
        contract = active_contract_payload(db, org_id)
    return {"contract": contract}


@app.get("/v1/contracts/versions", dependencies=[Depends(require_tenant_auth)])
def contracts_versions():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"versions": list_contract_versions(db, org_id)}


@app.get("/v1/contracts/audit", dependencies=[Depends(require_tenant_auth)])
def contracts_audit():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"audit": list_contract_audit(db, org_id)}


class ContractDraftPayload(BaseModel):
    title: str | None = None
    summary: str | None = None
    actor: str | None = None


@app.post("/v1/contracts/draft", dependencies=[Depends(require_tenant_auth)])
def contracts_create_draft(payload: ContractDraftPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        row = create_draft_contract(
            db,
            org_id,
            title=payload.title,
            summary=payload.summary,
            actor=payload.actor,
        )
        out = contract_to_dict(row, approval=_approval_for_contract(db, row.id))
    return {"ok": True, "contract": out}


@app.post("/v1/contracts/{contract_id}/publish", dependencies=[Depends(require_tenant_auth)])
def contracts_publish(contract_id: str, payload: ContractDraftPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        try:
            row = publish_contract(db, org_id, contract_id, actor=payload.actor)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        out = contract_to_dict(row, approval=_approval_for_contract(db, row.id))
    return {"ok": True, "contract": out}


class ContractApprovePayload(BaseModel):
    signerName: str
    signerEmail: str | None = None
    signerTitle: str | None = None
    attestationText: str | None = None
    actor: str | None = None


@app.post("/v1/contracts/{contract_id}/approve", dependencies=[Depends(require_tenant_auth)])
def contracts_approve(contract_id: str, payload: ContractApprovePayload):
    if not payload.signerName.strip():
        raise HTTPException(status_code=400, detail="signerName required")
    with get_db() as db:
        org_id = ensure_default_org(db)
        try:
            approve_contract(
                db,
                org_id,
                contract_id,
                signer_name=payload.signerName,
                signer_email=payload.signerEmail,
                signer_title=payload.signerTitle,
                attestation_text=payload.attestationText,
                actor=payload.actor,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        contract = active_contract_payload(db, org_id)
    return {"ok": True, "contract": contract}


@app.get("/v1/metrics/cpst-history", dependencies=[Depends(require_tenant_auth)])
def metrics_cpst_history():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {
            "history": list_cpst_history(db, org_id),
            "activeContract": active_contract_payload(db, org_id),
        }


@app.post("/v1/jobs/record-cpst-snapshots", dependencies=[Depends(require_tenant_auth)])
def job_record_cpst_snapshots():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return record_cpst_snapshots(db, org_id)


@app.get("/v1/reports/export.csv", dependencies=[Depends(require_tenant_auth)])
def reports_export_csv():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        body = export_cpst_csv(db, org_id, lookback_days=lookback)
    return PlainTextResponse(
        body,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=outcome-ledger-cpst.csv"},
    )


@app.get("/v1/reports/export.pdf", dependencies=[Depends(require_tenant_auth)])
def reports_export_pdf():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        try:
            body = export_cpst_pdf(db, org_id, lookback_days=lookback, require_approved=True)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e)) from e
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
    return Response(
        content=body,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=outcome-ledger-board-pack.pdf"},
    )


@app.get("/v1/metrics/attribution", dependencies=[Depends(require_tenant_auth)])
def metrics_attribution():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    try:
        with get_db() as db:
            org_id = ensure_default_org(db)
            return build_attribution_breakdown(db, org_id, lookback_days=lookback)
    except Exception as exc:
        logger.exception("metrics_attribution failed")
        raise HTTPException(status_code=500, detail="Attribution metrics failed") from exc


@app.get("/v1/metrics/benchmarks", dependencies=[Depends(require_tenant_auth)])
def metrics_benchmarks():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return build_benchmark_report(db, org_id, lookback_days=lookback)


@app.post("/v1/attribution/rebuild", dependencies=[Depends(require_tenant_auth)])
def attribution_rebuild():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return rebuild_attribution_graph(db, org_id, lookback_days=lookback)


class AttributionOverridePayload(BaseModel):
    usageEventId: str
    outcomeEventId: str
    reason: str
    allocatedUsd: float | None = None


@app.get("/v1/attribution/candidates", dependencies=[Depends(require_tenant_auth)])
def attribution_candidates(limit: int = 15):
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"candidates": list_link_candidates(db, org_id, limit=min(limit, 50))}


@app.get("/v1/attribution/inbox", dependencies=[Depends(require_tenant_auth)])
def attribution_inbox():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return build_inbox_summary(db, org_id)


@app.post("/v1/attribution/overrides", dependencies=[Depends(require_tenant_auth)])
def attribution_override(payload: AttributionOverridePayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        result = add_manual_override(
            db,
            org_id,
            usage_event_id=payload.usageEventId,
            outcome_event_id=payload.outcomeEventId,
            reason=payload.reason,
            allocated_usd=payload.allocatedUsd,
        )
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail=result.get("error", "override failed"))
    return result


class ExecutiveApprovePayload(BaseModel):
    signerName: str


@app.post("/v1/reports/executive", dependencies=[Depends(require_tenant_auth)])
def reports_executive_generate():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return create_executive_report(db, org_id, lookback_days=lookback)


@app.get("/v1/reports/executive/latest", dependencies=[Depends(require_tenant_auth)])
def reports_executive_latest():
    with get_db() as db:
        org_id = ensure_default_org(db)
        report = latest_executive_report(db, org_id)
    if not report:
        return {"report": None}
    return {"report": report}


@app.post(
    "/v1/reports/executive/{report_id}/approve",
    dependencies=[Depends(require_tenant_auth)],
)
def reports_executive_approve(report_id: str, payload: ExecutiveApprovePayload):
    name = (payload.signerName or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="signerName required")
    with get_db() as db:
        org_id = ensure_default_org(db)
        try:
            report = approve_executive_report(
                db, org_id, report_id, signer_name=name
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
    return {"ok": True, "report": report}


class GitHubReposPayload(BaseModel):
    repos: list[str]


class GitHubVerifyRepoPayload(BaseModel):
    repo: str


@app.get("/v1/connect/github/start", dependencies=[Depends(require_tenant_auth)])
def connect_github_start_authed():
    """Return GitHub OAuth URL for the current tenant workspace."""
    from app.github_oauth import _oauth_configured

    if not _oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth not configured (GITHUB_OAUTH_CLIENT_ID/SECRET)",
        )
    with get_db() as db:
        org_id = ensure_default_org(db)
    return {"authorizeUrl": build_authorize_url(org_id)}


@app.get("/v1/connect/github")
def connect_github_start():
    """Legacy redirect — uses default org when no tenant session."""
    from app.github_oauth import _oauth_configured

    if not _oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth not configured (GITHUB_OAUTH_CLIENT_ID/SECRET)",
        )
    with get_db() as db:
        org_id = ensure_default_org(db)
    return RedirectResponse(url=build_authorize_url(org_id), status_code=302)


@app.get("/v1/connect/github/callback")
def connect_github_callback(code: str | None = None, state: str | None = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    org_id = verify_oauth_state(state)
    if not org_id:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_payload = exchange_code(code)
    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="GitHub token exchange failed")

    user = fetch_github_user(access_token)
    login = str(user.get("login") or "github-user")
    scopes = str(token_payload.get("scope") or "")

    with get_db() as db:
        save_github_connection(
            db,
            org_id=org_id,
            access_token=access_token,
            login=login,
            scopes=scopes,
        )

    return RedirectResponse(
        url=f"{_dashboard_url()}/integrations?github=connected&login={login}",
        status_code=302,
    )


@app.get("/v1/connect/github/status", dependencies=[Depends(require_tenant_auth)])
def connect_github_status():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return combined_github_status(db, org_id)


@app.get("/v1/connect/github-app/install", dependencies=[Depends(require_tenant_auth)])
def connect_github_app_install_url():
    if not app_configured():
        raise HTTPException(
            status_code=503,
            detail="GitHub App not configured (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_SLUG)",
        )
    with get_db() as db:
        org_id = ensure_default_org(db)
    return {"installUrl": build_install_url(org_id)}


@app.get("/v1/connect/github-app/callback")
def connect_github_app_callback(
    installation_id: int | None = None,
    setup_action: str | None = None,
    state: str | None = None,
):
    if not installation_id or not state:
        raise HTTPException(status_code=400, detail="Missing installation_id or state")
    org_id = verify_oauth_state(state)
    if not org_id:
        raise HTTPException(status_code=400, detail="Invalid install state")

    with get_db() as db:
        result = complete_app_install(db, org_id=org_id, installation_id=installation_id)

    login = result.get("login") or "github"
    return RedirectResponse(
        url=f"{_dashboard_url()}/integrations?github_app=connected&login={login}&repos={result.get('repos_count', 0)}",
        status_code=302,
    )


@app.post("/v1/webhooks/github")
async def github_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256")
    if not verify_webhook_signature(body, sig):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event") or "unknown"
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    with get_db() as db:
        result = handle_github_webhook(db, event, payload)
    return result


@app.get("/v1/connect/github/repos/available", dependencies=[Depends(require_tenant_auth)])
def connect_github_repos_available():
    from app.github_app import get_app_connection

    with get_db() as db:
        org_id = ensure_default_org(db)
        app_row = get_app_connection(db, org_id)
        if app_row is not None:
            saved = parse_repos_json(app_row.repos_json)
            repos = [{"full_name": n, "private": None} for n in saved]
            return {"repos": repos, "count": len(repos), "mode": "app"}
        row = get_github_connection(db, org_id)
        if row is None:
            raise HTTPException(status_code=404, detail="GitHub not connected")
        listed = fetch_accessible_repos(row.access_token)
        saved = parse_repos_json(row.repos_json)
        repos = merge_repo_lists(listed, saved)
    return {"repos": repos, "count": len(repos), "mode": "oauth"}


@app.post("/v1/connect/github-app/refresh-repos", dependencies=[Depends(require_tenant_auth)])
def connect_github_app_refresh_repos():
    with get_db() as db:
        org_id = ensure_default_org(db)
        repos = refresh_installation_repos(db, org_id)
    if not repos:
        raise HTTPException(status_code=404, detail="GitHub App not installed")
    return {"ok": True, "repos": repos, "count": len(repos)}


@app.post("/v1/connect/github/repos/verify", dependencies=[Depends(require_tenant_auth)])
def connect_github_verify_repo(payload: GitHubVerifyRepoPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        row = get_github_connection(db, org_id)
        if row is None:
            raise HTTPException(status_code=404, detail="GitHub not connected")
        try:
            repo = verify_repo_access(row.access_token, payload.repo)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
    return {"ok": True, "repo": repo}


@app.post("/v1/connect/github/repos", dependencies=[Depends(require_tenant_auth)])
def connect_github_save_repos(payload: GitHubReposPayload):
    import json

    repos = [r.strip() for r in payload.repos if r.strip()]
    if not repos:
        raise HTTPException(status_code=400, detail="Select at least one repo")
    with get_db() as db:
        org_id = ensure_default_org(db)
        row = get_github_connection(db, org_id)
        if row is None:
            raise HTTPException(status_code=404, detail="GitHub not connected")
        verified: list[str] = []
        for name in repos:
            try:
                info = verify_repo_access(row.access_token, name)
                verified.append(info["full_name"])
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e)) from e
        row.repos_json = json.dumps(verified)
        db.flush()
    return {"ok": True, "repos": verified}


@app.post("/v1/connect/github/sync", dependencies=[Depends(require_tenant_auth)])
def connect_github_sync():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        win_type = primary_win_type(db, org_id)
        if win_type == WIN_TYPE_COMMIT:
            gh = ingest_github_default_branch_commits(
                db, org_id=org_id, lookback_days=lookback
            )
            rev = {"ok": True, "skipped": True}
        else:
            gh = ingest_github_merged_prs(db, org_id=org_id, lookback_days=lookback)
            rev = check_reverts(db, org_id)
    return {"ok": True, "github": gh, "reverts": rev, "winType": win_type}
