# Outcome Ledger

**Value accounting for AI-assisted engineering** — connect tool spend to accepted outcomes and report **CPST** (cost per successful outcome).

Standalone product. Not [Authon](https://github.com/aamirsec6/agent-money) / Agent Money.

## Repo layout

| Path | Purpose |
|------|---------|
| [`api/`](api/) | FastAPI — ingest, CPST, outcome contracts, GitHub |
| [`landing/`](landing/) | Next.js marketing + waitlist (Railway: root `landing`) |
| [`dashboard/`](dashboard/) | Next.js app dashboard |
| [`mcp/`](mcp/) | Local MCP agent — fetch all sources, push to cloud |
| [`docs/`](docs/) | PRD, moat, Railway, one-pager |

## Quick start (local)

```bash
# API
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set OUTCOME_LEDGER_API_KEY, optional vendors
uvicorn app.main:app --reload --port 8090

# Dashboard (another terminal)
cd dashboard
npm install
cp .env.example .env.local   # OUTCOME_LEDGER_API_URL=http://127.0.0.1:8090
npm run dev
```

Open http://localhost:3001

**Landing:** `cd landing && npm run dev` → http://localhost:3002 · **Dashboard:** `cd dashboard && npm run dev` → http://localhost:3001/overview — see [`landing/RAILWAY.md`](landing/RAILWAY.md) and [`docs/reddit-launch.md`](docs/reddit-launch.md)

**Reports flow:** Integrations → sync → Reports → Generate narrative → Approve → Export PDF

## Railway

Use a **dedicated Railway project** (not Authon). See [`docs/railway-project.md`](docs/railway-project.md).

| Service | Root directory |
|---------|----------------|
| API | `api` |
| Landing | `landing` |
| Dashboard | `dashboard` |

## Define a win

**Settings** in the dashboard: choose **merged PR** or **default branch commit** (master/main), then run **Sync**.

## Local MCP agent

Fetch OpenAI, Anthropic, Cursor, Claude Code, Copilot, and GitHub on your machine:

```bash
cd mcp && pip install -e .
outcome-ledger-mcp configure --outcome-ledger-url http://127.0.0.1:8090 --outcome-ledger-key ol_...
outcome-ledger-mcp sync --since 30d
```

See [docs/mcp-setup.md](docs/mcp-setup.md), [docs/agent-setup-one-pager.md](docs/agent-setup-one-pager.md), and [mcp/README.md](mcp/README.md).

## Docs

- [MCP setup](docs/mcp-setup.md)
- [Problem & feasibility PDF](docs/Outcome-Ledger-Problem-Feasibility.pdf) — validate the problem, CPST costing, MVP feasibility (regenerate: `python3 scripts/generate_feasibility_pdf.py`)
- [Product one-pager](docs/value-one-pager.md)
- [PRD](docs/prd.md)
- [Moat strategy](docs/moat.md)
- [Enterprise roadmap](docs/enterprise-roadmap.md)
- [Alerts & digest setup](docs/notifications-setup.md) — Slack, weekly email, GitHub PR comments

## License

MIT — see [LICENSE](LICENSE).
