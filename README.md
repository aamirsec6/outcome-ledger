# Outcome Ledger

**Value accounting for AI-assisted engineering** — connect tool spend to accepted outcomes and report **CPST** (cost per successful outcome).

Standalone product. Not [Authon](https://github.com/aamirsec6/agent-money) / Agent Money.

## Repo layout

| Path | Purpose |
|------|---------|
| [`api/`](api/) | FastAPI — ingest, CPST, outcome contracts, GitHub |
| [`dashboard/`](dashboard/) | Next.js dashboard |
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

Open http://localhost:3000

## Railway

Use a **dedicated Railway project** (not Authon). See [`docs/railway-project.md`](docs/railway-project.md).

| Service | Root directory |
|---------|----------------|
| API | `api` |
| Dashboard | `dashboard` |

## Define a win

**Settings** in the dashboard: choose **merged PR** or **default branch commit** (master/main), then run **Sync**.

## Docs

- [Product one-pager](docs/value-one-pager.md)
- [PRD](docs/prd.md)
- [Moat strategy](docs/moat.md)
- [Enterprise roadmap](docs/enterprise-roadmap.md)

## License

MIT — see [LICENSE](LICENSE).
