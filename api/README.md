# Outcome Ledger API

Real ingest for AI spend + GitHub outcomes. **Standalone** — not Authon.

## Setup

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set OPENAI_API_KEY, OPENAI_ORG_ID, ANTHROPIC_ADMIN_API_KEY, GITHUB_TOKEN, GITHUB_REPOS, OUTCOME_LEDGER_API_KEY
uvicorn app.main:app --reload --port 8090
```

## Sync live data

```bash
curl -X POST http://127.0.0.1:8090/v1/sync \
  -H "X-Api-Key: YOUR_OUTCOME_LEDGER_API_KEY"
```

## CSV import (Cursor, Anthropic, etc.)

CSV columns: `date`, `cost_usd`, optional `source`, `team_id`

```bash
curl -X POST http://127.0.0.1:8090/v1/imports/usage-csv \
  -H "X-Api-Key: YOUR_KEY" \
  -F "file=@usage.csv" \
  -F "source=cursor"
```

## Dashboard

Point `OUTCOME_LEDGER_API_URL=http://127.0.0.1:8090` in `dashboard/.env.local`.

### Reports (board pack)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/reports/executive` | Generate exec narrative (template or OpenAI) |
| GET | `/v1/reports/executive/latest` | Latest narrative run |
| POST | `/v1/reports/executive/{id}/approve` | Human approve before PDF (`signerName`) |
| GET | `/v1/reports/export.pdf` | Board pack PDF (requires approved narrative) |
| GET | `/v1/metrics/attribution` | Attributed vs unassigned spend breakdown |

### Moat APIs (outcome contract + CPST history)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/contracts/active` | Active outcome contract + CFO approval |
| POST | `/v1/contracts/draft` | New draft version from active |
| POST | `/v1/contracts/{id}/publish` | Activate draft (supersedes prior) |
| POST | `/v1/contracts/{id}/approve` | CFO sign-off (`signerName` required) |
| GET | `/v1/metrics/cpst-history` | Monthly immutable CPST snapshots |
| GET | `/v1/contracts/audit` | Definition change audit trail |

Snapshots refresh on each `POST /v1/sync` (and cron).

```bash
GET /v1/metrics/overview
```

## Railway

See [`RAILWAY.md`](RAILWAY.md) — service name `outcome-ledger-api`, Root Directory `api`, add Postgres plugin.
