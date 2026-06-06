# Alerts, digest & stickiness layer

Outcome Ledger pushes CPST into the tools your team already uses — Slack, email, GitHub PRs, and the attribution inbox.

## Configure (dashboard)

**Settings → Alerts & digest**

| Setting | What it does |
|---------|----------------|
| Slack webhook URL | Incoming webhook from your Slack app |
| Slack alerts enabled | Post after each sync when CPST spikes, budget threshold hit, or inbox items pending |
| Digest emails | Comma-separated recipients for Monday summary |
| Monthly AI budget (USD) | Triggers budget-burn alert when MTD spend crosses threshold % |
| GitHub PR comments | Posts attributed AI cost on newly merged PRs |

Use **Send test to Slack** / **Send test digest now** to verify before enabling cron.

## Cron jobs (Railway)

Set `CRON_SECRET` on the API service. Call with header `X-Cron-Secret: <value>`.

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| Daily 02:00 UTC | `POST /v1/cron/sync-all` | Ingest all workspaces + post-sync Slack/PR comments |
| Monday 08:00 UTC | `POST /v1/cron/weekly-digest` | Email digest (`?force=true` to test any day) |

Legacy single-org cron: `POST /v1/cron/sync` (default org only).

## API

- `GET/PUT /v1/settings/notifications`
- `GET /v1/attribution/inbox` — `{ pendingCount, reviewUrl }`
- `POST /v1/notifications/test-slack`
- `POST /v1/notifications/test-digest`

## Requirements

- **Slack:** Create an Incoming Webhook in your Slack workspace
- **Email digest:** `RESEND_API_KEY` + `WAITLIST_FROM_EMAIL` on API (same as waitlist)
- **GitHub PR comments:** GitHub OAuth connected; token needs `repo` scope (default)
