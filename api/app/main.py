from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, RedirectResponse, Response
from pydantic import BaseModel

from app.db import get_db, init_db
from app.security import cors_origins, is_production, require_api_key, validate_startup_config
from app.github_oauth import (
    _dashboard_url,
    build_authorize_url,
    exchange_code,
    fetch_accessible_repos,
    fetch_github_user,
    get_github_connection,
    github_status,
    merge_repo_lists,
    parse_repos_json,
    save_github_connection,
    verify_oauth_state,
    verify_repo_access,
)
from app.ingest_csv import ingest_usage_csv
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
from app.metrics import build_attribution_breakdown, build_overview, ensure_default_org
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
from app.waitlist_notify import handle_signup_notifications
from app.wins import list_wins, win_definition_for_org

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    cfg = validate_startup_config()
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


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "outcome-ledger-api",
        "version": "0.2.1",
        "metricVersion": metric_version(),
        "stableDays": int(os.getenv("OUTCOME_STABLE_DAYS", "7")),
        "production": is_production(),
        "apiKeyRequired": is_production(),
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


@app.get("/v1/waitlist/signups", dependencies=[Depends(require_api_key)])
def waitlist_list_signups():
    with get_db() as db:
        return {"signups": list_signups(db), "stats": public_waitlist_stats(db)}


def _require_cron_secret(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    expected = (os.getenv("CRON_SECRET") or "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")
    if not x_cron_secret or x_cron_secret.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid cron secret")


@app.post("/v1/sync", dependencies=[Depends(require_api_key)])
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


@app.post("/v1/jobs/check-reverts", dependencies=[Depends(require_api_key)])
def job_check_reverts():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return check_reverts(db, org_id)


@app.post("/v1/imports/usage-csv", dependencies=[Depends(require_api_key)])
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


@app.get("/v1/metrics/overview", dependencies=[Depends(require_api_key)])
def metrics_overview():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        overview = build_overview(db, org_id, lookback_days=lookback)
        overview["winDefinition"] = win_definition_for_org(db, org_id)
        return overview


@app.get("/v1/wins", dependencies=[Depends(require_api_key)])
def wins_list():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return list_wins(db, org_id, lookback_days=lookback)


@app.get("/v1/integrations/status", dependencies=[Depends(require_api_key)])
def integrations_status():
    with get_db() as db:
        org_id = ensure_default_org(db)
        overview = build_overview(db, org_id)
    return {"integrations": overview["integrations"]}


@app.get("/v1/settings/vendors", dependencies=[Depends(require_api_key)])
def settings_vendors():
    from app.metrics import _vendor_configured

    return {
        "openai": {"configured": _vendor_configured("openai")},
        "anthropic": {"configured": _vendor_configured("anthropic")},
        "githubOAuth": bool(
            (os.getenv("GITHUB_OAUTH_CLIENT_ID") or "").strip()
            and (os.getenv("GITHUB_OAUTH_CLIENT_SECRET") or "").strip()
        ),
    }


@app.get("/v1/settings/outcome-win", dependencies=[Depends(require_api_key)])
def get_outcome_win_settings():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return get_win_settings(db, org_id)


class OutcomeWinPayload(BaseModel):
    winType: str
    actor: str | None = None


@app.put("/v1/settings/outcome-win", dependencies=[Depends(require_api_key)])
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


@app.get("/v1/settings/org-profile", dependencies=[Depends(require_api_key)])
def get_org_profile():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"profile": org_profile_payload(db, org_id)}


@app.put("/v1/settings/org-profile", dependencies=[Depends(require_api_key)])
def put_org_profile(payload: OrgProfilePayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        profile = update_org_profile(db, org_id, payload.model_dump())
    return {"ok": True, "profile": profile}


@app.get("/v1/settings/team-mappings", dependencies=[Depends(require_api_key)])
def get_team_mappings():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"mappings": list_team_mappings(db, org_id)}


class TeamMappingsPayload(BaseModel):
    mappings: list[dict]


@app.put("/v1/settings/team-mappings", dependencies=[Depends(require_api_key)])
def put_team_mappings(payload: TeamMappingsPayload):
    with get_db() as db:
        org_id = ensure_default_org(db)
        saved = replace_team_mappings(db, org_id, payload.mappings)
    return {"ok": True, "mappings": saved}


@app.get("/v1/sync/history", dependencies=[Depends(require_api_key)])
def get_sync_history():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"runs": sync_history(db, org_id)}


@app.get("/v1/contracts/active", dependencies=[Depends(require_api_key)])
def contracts_active():
    with get_db() as db:
        org_id = ensure_default_org(db)
        ensure_default_contract(db, org_id)
        contract = active_contract_payload(db, org_id)
    return {"contract": contract}


@app.get("/v1/contracts/versions", dependencies=[Depends(require_api_key)])
def contracts_versions():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"versions": list_contract_versions(db, org_id)}


@app.get("/v1/contracts/audit", dependencies=[Depends(require_api_key)])
def contracts_audit():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {"audit": list_contract_audit(db, org_id)}


class ContractDraftPayload(BaseModel):
    title: str | None = None
    summary: str | None = None
    actor: str | None = None


@app.post("/v1/contracts/draft", dependencies=[Depends(require_api_key)])
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


@app.post("/v1/contracts/{contract_id}/publish", dependencies=[Depends(require_api_key)])
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


@app.post("/v1/contracts/{contract_id}/approve", dependencies=[Depends(require_api_key)])
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


@app.get("/v1/metrics/cpst-history", dependencies=[Depends(require_api_key)])
def metrics_cpst_history():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return {
            "history": list_cpst_history(db, org_id),
            "activeContract": active_contract_payload(db, org_id),
        }


@app.post("/v1/jobs/record-cpst-snapshots", dependencies=[Depends(require_api_key)])
def job_record_cpst_snapshots():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return record_cpst_snapshots(db, org_id)


@app.get("/v1/reports/export.csv", dependencies=[Depends(require_api_key)])
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


@app.get("/v1/reports/export.pdf", dependencies=[Depends(require_api_key)])
def reports_export_pdf():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        try:
            body = export_cpst_pdf(db, org_id, lookback_days=lookback, require_approved=True)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e)) from e
    return Response(
        content=body,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=outcome-ledger-board-pack.pdf"},
    )


@app.get("/v1/metrics/attribution", dependencies=[Depends(require_api_key)])
def metrics_attribution():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return build_attribution_breakdown(db, org_id, lookback_days=lookback)


class ExecutiveApprovePayload(BaseModel):
    signerName: str


@app.post("/v1/reports/executive", dependencies=[Depends(require_api_key)])
def reports_executive_generate():
    lookback = int(os.getenv("SYNC_LOOKBACK_DAYS", "90"))
    with get_db() as db:
        org_id = ensure_default_org(db)
        return create_executive_report(db, org_id, lookback_days=lookback)


@app.get("/v1/reports/executive/latest", dependencies=[Depends(require_api_key)])
def reports_executive_latest():
    with get_db() as db:
        org_id = ensure_default_org(db)
        report = latest_executive_report(db, org_id)
    if not report:
        return {"report": None}
    return {"report": report}


@app.post(
    "/v1/reports/executive/{report_id}/approve",
    dependencies=[Depends(require_api_key)],
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


@app.get("/v1/connect/github")
def connect_github_start():
    """Redirect user to GitHub OAuth."""
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


@app.get("/v1/connect/github/status", dependencies=[Depends(require_api_key)])
def connect_github_status():
    with get_db() as db:
        org_id = ensure_default_org(db)
        return github_status(db, org_id)


@app.get("/v1/connect/github/repos/available", dependencies=[Depends(require_api_key)])
def connect_github_repos_available():
    with get_db() as db:
        org_id = ensure_default_org(db)
        row = get_github_connection(db, org_id)
        if row is None:
            raise HTTPException(status_code=404, detail="GitHub not connected")
        listed = fetch_accessible_repos(row.access_token)
        saved = parse_repos_json(row.repos_json)
        repos = merge_repo_lists(listed, saved)
    return {"repos": repos, "count": len(repos)}


@app.post("/v1/connect/github/repos/verify", dependencies=[Depends(require_api_key)])
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


@app.post("/v1/connect/github/repos", dependencies=[Depends(require_api_key)])
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


@app.post("/v1/connect/github/sync", dependencies=[Depends(require_api_key)])
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
