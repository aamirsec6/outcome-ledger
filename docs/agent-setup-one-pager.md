# Outcome Ledger — Private sync agent (one-pager)

**For:** CTO, platform lead, IT  
**Time to complete:** about 10 minutes

## When to use this

| Use cloud dashboard (default) | Use private sync agent |
|------------------------------|------------------------|
| Most teams | Security requires keys on-prem |
| Connect OpenAI/GitHub in the browser | No vendor keys stored on Outcome Ledger servers |
| Click **Sync** in Integrations | Run a small agent on a laptop or CI runner |

## Three steps

### 1. Copy your agent key

1. Sign in to Outcome Ledger.
2. Go to **Settings** → **Agent API key** → **Rotate agent key** (or **Integrations** → **Private sync agent** → **Create agent key**).
3. Copy the `ol_…` key and store it in your password manager. **Shown once.**

### 2. Install the agent

On the machine that has access to OpenAI, GitHub, and billing exports:

```bash
pip install "outcome-ledger-mcp @ git+https://github.com/aamirsec6/outcome-ledger.git@main#subdirectory=mcp"
```

Or run the interactive wizard:

```bash
outcome-ledger-mcp init
```

### 3. Sync data

```bash
outcome-ledger-mcp configure \
  --outcome-ledger-url https://outcome-ledger-production.up.railway.app \
  --outcome-ledger-key ol_YOUR_KEY

outcome-ledger-mcp test
outcome-ledger-mcp sync --since 30d
```

Open **Overview** in the dashboard — CPST updates when usage and outcome events are received.

## What the agent collects

- **Spend:** OpenAI, Anthropic, Cursor CSV, Claude Code CSV, Copilot (API or CSV)
- **Outcomes:** merged GitHub pull requests

We do **not** store prompts or source code — only aggregates (cost, tokens, PR metadata).

## Daily automation

```bash
0 6 * * * outcome-ledger-mcp sync --since 1d
```

## Security

- Vendor API keys stay in `~/.outcome-ledger/config.json` (file mode 600).
- Only normalized events are sent to Outcome Ledger over HTTPS.
- Rotate the agent key anytime in **Settings**.

## Help

- Full guide: [mcp-setup.md](mcp-setup.md)
- Package README: [../mcp/README.md](../mcp/README.md)
