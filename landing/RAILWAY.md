# Outcome Ledger — Landing (Railway)

Public marketing site + waitlist. **Root Directory:** `landing`

If GitHub deploys fail with `railpack process exited with an error`, run once from repo root: `../scripts/railway-ensure-monorepo.sh` (see [RAILWAY_MONOREPO.md](../RAILWAY_MONOREPO.md)).

## Create the service (Railway UI)

1. Open project **outcome-ledger** → **+ New** → **GitHub Repo** (same monorepo) or **Empty Service**.
2. Name: `outcome-ledger-landing`
3. **Settings → Source → Root Directory:** `landing`
4. **Settings → Networking → Generate Domain**
5. **Variables:**

| Variable | Value |
|----------|--------|
| `OUTCOME_LEDGER_API_URL` | `https://outcome-ledger-production.up.railway.app` |
| `NEXT_PUBLIC_OUTCOME_LEDGER_API_URL` | same |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://outcome-ledger-dashboard-production.up.railway.app` |

6. **API service** — add landing URL to `CORS_ORIGINS` (comma-separated):

```text
https://outcome-ledger-dashboard-production.up.railway.app,https://YOUR-LANDING.up.railway.app
```

## Create via CLI

```bash
cd /path/to/outcome-ledger
railway link   # project outcome-ledger

# In Railway UI: New service → name outcome-ledger-landing, root directory landing
railway service link outcome-ledger-landing
railway variables set \
  OUTCOME_LEDGER_API_URL=https://outcome-ledger-production.up.railway.app \
  NEXT_PUBLIC_OUTCOME_LEDGER_API_URL=https://outcome-ledger-production.up.railway.app \
  NEXT_PUBLIC_DASHBOARD_URL=https://outcome-ledger-dashboard-production.up.railway.app

railway up landing --path-as-root --detach
```

## Health

```bash
curl https://YOUR-LANDING.up.railway.app/api/health
```

## Routes

| Path | Page |
|------|------|
| `/` | Product landing |
| `/join` | Waitlist + news |
