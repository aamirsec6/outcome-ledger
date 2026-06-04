# Outcome Ledger dashboard on Railway

**Dedicated repo** — connect Railway to `github.com/aamirsec6/outcome-ledger`, not Agent Money.

Deploy **`outcome-ledger-api` first** — see [`../api/RAILWAY.md`](../api/RAILWAY.md).

## Create the service (one-time)

1. Railway project → **New Service** → GitHub repo (same repo is fine).
2. **Service name:** `outcome-ledger-dashboard`
3. **Settings → Source → Root Directory:** `dashboard`
4. Confirm build uses `dashboard/Dockerfile` (via `railway.toml`).

## Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OUTCOME_LEDGER_API_URL` | Yes (live data) | Server-side fetch to API, e.g. `https://outcome-ledger-api-production.up.railway.app` |
| `NEXT_PUBLIC_OUTCOME_LEDGER_API_URL` | Optional | Same URL if client-side fetch added later |

Without API URL → dashboard falls back to **demo mock data**.

**Do not set** `AGENT_MONEY_API_URL`, `AUTHON_*`, `CLERK_*`, or `TENANT_DASHBOARD_SECRET`.

## Deploy

```bash
railway link
railway service link outcome-ledger-dashboard
railway up dashboard --path-as-root --detach
```

## Verify

```bash
curl -s https://YOUR-DASHBOARD.up.railway.app/api/health
# {"ok":true,"service":"outcome-ledger-dashboard",...}
```

Overview page badge: **live** when API connected, **demo data** when not.

## Common mistake

Set Root Directory to **`dashboard`** (this repo root is Outcome Ledger only).
