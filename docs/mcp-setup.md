# Outcome Ledger MCP setup

The **Outcome Ledger MCP** is a local agent that fetches data from your AI tools and GitHub, then pushes normalized events to the cloud API. Use it when you want per-user attribution without storing vendor keys on Railway.

**Non-technical summary:** [agent-setup-one-pager.md](agent-setup-one-pager.md)

## Prerequisites

| Source | What you need |
|--------|----------------|
| Outcome Ledger | Workspace API key (`ol_*`) from dashboard registration |
| OpenAI | Admin API key with `api.usage.read` + optional `proj_...` |
| Anthropic | Admin key (`sk-ant-admin-...`) |
| GitHub | PAT or OAuth token with `repo` read; comma-separated `owner/repo` list |
| Cursor | Admin billing CSV (auto-discovered in Downloads or `~/.outcome-ledger/imports`) |
| Claude Code | Per-engineer usage CSV in watch paths |
| Copilot | GitHub Enterprise Copilot API **or** Copilot billing CSV |

## Install

```bash
cd mcp && pip install -e .
```

## Configure

```bash
outcome-ledger-mcp configure \
  --outcome-ledger-url "$OUTCOME_LEDGER_URL" \
  --outcome-ledger-key "$OUTCOME_LEDGER_KEY" \
  --github-token "$GITHUB_TOKEN" \
  --github-repos "acme/frontend,acme/backend"
```

## Verify

```bash
outcome-ledger-mcp test
outcome-ledger-mcp sync --since 30d --dry-run
outcome-ledger-mcp sync --since 30d
```

## Cursor IDE

```json
{
  "mcpServers": {
    "outcome-ledger": {
      "command": "outcome-ledger-mcp",
      "args": ["serve"],
      "env": {
        "OUTCOME_LEDGER_URL": "https://outcome-ledger-production.up.railway.app",
        "OUTCOME_LEDGER_KEY": "ol_..."
      }
    }
  }
}
```

## Cloud API endpoints (used by MCP)

- `GET /v1/tenants/me` — validate workspace key
- `POST /v1/ingest/usage` — batch usage events
- `POST /v1/ingest/outcomes` — batch outcome events
- `POST /v1/ingest/sync-complete` — audit log entry
- `GET /v1/ingest/status` — ingest totals by source

## Daily cron

```bash
0 6 * * * /usr/local/bin/outcome-ledger-mcp sync --since 1d
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `401` on ingest | Regenerate `ol_*` key; run `configure` again |
| OpenAI `403` | Use admin key, not project service account |
| Cursor not found | Export CSV from Cursor admin; drop in `~/Downloads` |
| Copilot API 404 | Use Enterprise org or upload Copilot CSV |

Package README: [mcp/README.md](../mcp/README.md).
