# Outcome Ledger — Railway project (separate from Authon)

**Project:** `outcome-ledger` (new — not `aware-insight`)  
**Project ID:** `ffec287d-1920-4838-bcbb-fdb10fc8baba`

## Connect GitHub (auto-deploy on push)

Monorepo: link **the same repo** on **each** service with a different root directory.  
See **[railway-github-connect.md](railway-github-connect.md)** for step-by-step UI instructions and troubleshooting.

## Services

| Service | Root Directory | Public URL |
|---------|----------------|------------|
| `outcome-ledger` (API) | `api` | https://outcome-ledger-production.up.railway.app |
| `outcome-ledger-landing` | `landing` | https://outcome-ledger-landing-production.up.railway.app |
| `outcome-ledger-dashboard` | `dashboard` | https://outcome-ledger-dashboard-production.up.railway.app |
| `Postgres` | (Railway plugin) | internal |

## One-time env vars (Railway UI)

### API service (`outcome-ledger`)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `OUTCOME_LEDGER_API_KEY` | generate a long random secret |
| `OPENAI_API_KEY` | Org **Admin** API key — [`openai-setup.md`](openai-setup.md) |
| `OPENAI_ORG_ID` | `org-...` from OpenAI org settings (recommended) |
| `ANTHROPIC_ADMIN_API_KEY` | `sk-ant-admin...` (optional) |
| `GITHUB_TOKEN` | PAT (optional) |
| `GITHUB_REPOS` | `org/repo,org/repo2` |
| `CORS_ORIGINS` | `https://outcome-ledger-dashboard-production.up.railway.app,https://outcome-ledger-landing-production.up.railway.app` |
| `RESEND_API_KEY` | from [resend.com](https://resend.com) — see [`resend-setup.md`](resend-setup.md) |
| `WAITLIST_NOTIFY_EMAILS` | your inbox for waitlist alerts |
| `WAITLIST_FROM_EMAIL` | `onboarding@resend.dev` (test) or verified domain sender |
| `LANDING_URL` | `https://outcome-ledger-landing-production.up.railway.app` |

### Landing service (`outcome-ledger-landing`)

Root Directory: **`landing`**. See [`landing/RAILWAY.md`](../landing/RAILWAY.md).

| Variable | Value |
|----------|--------|
| `OUTCOME_LEDGER_API_URL` | `https://outcome-ledger-production.up.railway.app` |
| `NEXT_PUBLIC_OUTCOME_LEDGER_API_URL` | same |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://outcome-ledger-dashboard-production.up.railway.app` |

### Dashboard service (`outcome-ledger-dashboard`)

| Variable | Value |
|----------|--------|
| `OUTCOME_LEDGER_API_URL` | `https://outcome-ledger-production.up.railway.app` |
| `NEXT_PUBLIC_OUTCOME_LEDGER_API_URL` | same as above |

**Do not** copy Authon / Agent Money / Clerk variables into this project.

## After env vars — sync live data

```bash
curl -X POST https://outcome-ledger-production.up.railway.app/v1/sync \
  -H "X-Api-Key: YOUR_OUTCOME_LEDGER_API_KEY"
```

## Redeploy from CLI

```bash
railway link   # select project outcome-ledger

railway service link outcome-ledger
railway up api --path-as-root --detach

railway service link outcome-ledger-dashboard
railway up dashboard --path-as-root --detach

railway service link outcome-ledger-landing
railway up landing --path-as-root --detach
```

## Health checks

```bash
curl https://outcome-ledger-production.up.railway.app/health
curl https://outcome-ledger-dashboard-production.up.railway.app/api/health
curl https://YOUR-LANDING.up.railway.app/api/health
```

## Why a new project?

- Zero shared secrets with Authon / Agent Money (`aware-insight`)
- Separate billing and service list
- Clear brand boundary for Outcome Ledger
