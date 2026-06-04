# Outcome Ledger MCP

Local MCP server and CLI that **fetches** AI tool usage (OpenAI, Anthropic, Cursor, Claude Code, Copilot) and GitHub PR outcomes, then syncs to your Outcome Ledger workspace.

Vendor API keys stay on your machine. Only normalized events and your workspace key (`ol_*`) are sent to the cloud API.

## Install

```bash
cd mcp
pip install -e .
```

Or with uv:

```bash
uv pip install -e mcp/
```

## Configure

```bash
outcome-ledger-mcp configure \
  --outcome-ledger-url https://outcome-ledger-production.up.railway.app \
  --outcome-ledger-key ol_YOUR_KEY \
  --openai-key sk-admin-... \
  --anthropic-key sk-ant-admin-... \
  --github-token ghp_... \
  --github-repos "your-org/frontend,your-org/api"
```

Config is saved to `~/.outcome-ledger/config.json` (mode `0600`).

## Sync (fetch all)

```bash
outcome-ledger-mcp sync --since 30d
outcome-ledger-mcp test
outcome-ledger-mcp status
```

## Cursor / Claude Desktop MCP

Add to MCP settings:

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

### MCP tools

| Tool | Description |
|------|-------------|
| `outcome_ledger_sync` | Fetch all sources and push to cloud |
| `outcome_ledger_test_connections` | Probe each source |
| `outcome_ledger_status` | Local + cloud ingest status |
| `outcome_ledger_list_sources` | Configured extractors |

## Cursor / Claude Code CSV auto-fetch

Place admin billing exports in `~/Downloads` or `~/.outcome-ledger/imports/`. The agent picks the newest file matching `*cursor*.csv`, `*claude*.csv`, or `*copilot*.csv`.

## Cron

```bash
0 6 * * * outcome-ledger-mcp sync --since 1d >> ~/.outcome-ledger/sync.log 2>&1
```

See [docs/mcp-setup.md](../docs/mcp-setup.md) for full setup.
