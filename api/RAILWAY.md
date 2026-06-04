# Outcome Ledger API on Railway

**Dedicated repo** — connect Railway to `github.com/aamirsec6/outcome-ledger`, not Agent Money.

## Create the service (one-time)

1. Railway project → **New Service** → same GitHub repo.
2. **Service name:** `outcome-ledger` (production) or `outcome-ledger-api` if you created it that way
3. **Root Directory:** `api`
4. **Add PostgreSQL** (recommended) — Railway injects `DATABASE_URL` automatically.

## Required variables

| Variable | Purpose |
|----------|---------|
| `OUTCOME_LEDGER_API_KEY` | Protects `POST /v1/sync` and CSV import |
| `DATABASE_URL` | Postgres (Railway plugin) or `sqlite:///./outcome_ledger.db` locally |

## Ingest credentials (at least one spend + GitHub for outcomes)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Org admin key for `/v1/organization/costs` |
| `OPENAI_ORG_ID` | Optional `OpenAI-Organization` header |
| `ANTHROPIC_ADMIN_API_KEY` | Admin key `sk-ant-admin...` for cost_report |
| `GITHUB_TOKEN` | PAT with repo read |
| `GITHUB_REPOS` | Comma-separated `org/repo` list |

| Variable | Default |
|----------|---------|
| `SYNC_LOOKBACK_DAYS` | `90` |
| `CORS_ORIGINS` | `*` (set dashboard URL in prod) |

**Do not set** Authon / Agent Money variables on this service.

## Deploy

```bash
railway service link outcome-ledger-api
railway up api --path-as-root --detach
```

## After deploy — first sync

```bash
export API=https://outcome-ledger-api-production.up.railway.app
curl -X POST "$API/v1/sync" -H "X-Api-Key: YOUR_OUTCOME_LEDGER_API_KEY"
curl "$API/v1/metrics/overview"
```

## Wire dashboard

On **`outcome-ledger-dashboard`** service:

```
OUTCOME_LEDGER_API_URL=https://outcome-ledger-api-production.up.railway.app
NEXT_PUBLIC_OUTCOME_LEDGER_API_URL=https://outcome-ledger-api-production.up.railway.app
```

Redeploy dashboard. Overview badge should show **live**.

## Cron (optional)

Railway cron or external scheduler: `POST /v1/sync` daily with `X-Api-Key`.

## Common mistake

Set Root Directory to **`api`** (this repo root is Outcome Ledger only).
