# GitHub App setup (Weave-style)

Outcome Ledger supports **GitHub App** install (recommended) alongside legacy OAuth.

## Why GitHub App

| OAuth (legacy) | GitHub App (recommended) |
|----------------|--------------------------|
| Per-user authorize | Org/account install once |
| Poll on cron | **Webhooks** on PR merge |
| Manual repo picker | All installed repos auto-tracked |
| Broad `repo` scope | Granular read + PR write (comments) |

## 1. Create the GitHub App

GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**

| Field | Value |
|-------|-------|
| Name | `Outcome Ledger` (or your brand) |
| Homepage URL | `https://outcome-ledger-dashboard-production.up.railway.app` |
| Callback URL | *(leave empty for install-only)* |
| **Setup URL** | `https://outcome-ledger-production.up.railway.app/v1/connect/github-app/callback` |
| Webhook URL | `https://outcome-ledger-production.up.railway.app/v1/webhooks/github` |
| Webhook secret | Generate — set as `GITHUB_WEBHOOK_SECRET` |
| Active | Yes |

### Permissions

| Resource | Access |
|----------|--------|
| Pull requests | Read & write (read merges, post cost comments) |
| Metadata | Read |

### Subscribe to events

- `pull_request`
- `installation`
- `installation_repositories`

Generate a **private key** and download the `.pem` file.

Note the **App ID** and **slug** (URL: `github.com/apps/your-slug`).

## 2. API env vars (Railway)

```env
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=outcome-ledger
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
# Or: GITHUB_APP_PRIVATE_KEY_PATH=/path/to/key.pem
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_APP_SETUP_URL=https://outcome-ledger-production.up.railway.app/v1/connect/github-app/callback
PUBLIC_API_URL=https://outcome-ledger-production.up.railway.app
DASHBOARD_URL=https://outcome-ledger-dashboard-production.up.railway.app
```

Redeploy API after saving.

## 3. User flow (dashboard)

1. **Integrations** → **Install Outcome Ledger on GitHub**
2. GitHub install screen (all repos or select) → **Install**
3. Redirect back to Integrations — webhooks live
4. Merge a PR → outcome ingested in real time + optional PR cost comment + Slack alert

## 4. API routes

| Route | Purpose |
|-------|---------|
| `GET /v1/connect/github-app/install` | Returns `{ installUrl }` for dashboard |
| `GET /v1/connect/github-app/callback` | Setup URL after install (links installation → org) |
| `POST /v1/connect/github-app/refresh-repos` | Re-list repos from installation |
| `POST /v1/webhooks/github` | Webhook receiver (signature verified) |

## 5. OAuth fallback

Keep `GITHUB_OAUTH_CLIENT_ID` / `SECRET` for teams that cannot install apps. App mode takes precedence when both are connected.

See also: [github-connect.md](github-connect.md) (OAuth), [notifications-setup.md](notifications-setup.md) (Slack/digest).
