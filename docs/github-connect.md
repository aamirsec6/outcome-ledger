# GitHub Connect (OAuth)

## 1. Create a GitHub OAuth App

GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**

| Field | Local dev | Production |
|-------|-----------|------------|
| Application name | Outcome Ledger (dev) | Outcome Ledger |
| Homepage URL | `http://localhost:3001` | `https://outcome-ledger-dashboard-production.up.railway.app` |
| Authorization callback URL | `http://127.0.0.1:8090/v1/connect/github/callback` | `https://outcome-ledger-production.up.railway.app/v1/connect/github/callback` |

Copy **Client ID** and generate **Client secret**.

## 2. API env vars (Railway `outcome-ledger` service)

```env
GITHUB_OAUTH_CLIENT_ID=Ov23li...
GITHUB_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_CALLBACK_URL=https://outcome-ledger-production.up.railway.app/v1/connect/github/callback
PUBLIC_API_URL=https://outcome-ledger-production.up.railway.app
DASHBOARD_URL=https://outcome-ledger-dashboard-production.up.railway.app
OUTCOME_LEDGER_API_KEY=...   # already set — used for repo save + sync
```

Redeploy API after saving.

## 3. Dashboard env vars

```env
OUTCOME_LEDGER_API_URL=https://outcome-ledger-production.up.railway.app
OUTCOME_LEDGER_API_KEY=same-as-api-service
```

Redeploy dashboard.

## 4. User flow

1. Open **Integrations** → **Connect with GitHub**
2. Authorize on GitHub
3. Redirect back → pick repos → **Save repos & sync**
4. Overview shows merged PR outcomes + CPST

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/connect/github` | Start OAuth (redirect) |
| GET | `/v1/connect/github/callback` | GitHub redirect target |
| GET | `/v1/connect/github/status` | Connected? login? repos? |
| GET | `/v1/connect/github/repos/available` | List repos for picker |
| POST | `/v1/connect/github/repos` | Save selected repos (API key) |
| POST | `/v1/connect/github/sync` | Ingest merged PRs (API key) |
