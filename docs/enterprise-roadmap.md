# Outcome Ledger — Enterprise roadmap

**Status:** Phase A complete · PRD MVP export layer shipped  
**Metric standard:** `CPST v1.0` — fully loaded AI spend ÷ **stable accepted outcomes**  
**Stable outcome:** merged PR, not reverted within `OUTCOME_STABLE_DAYS` (default 7)

---

## Phase A — Believable numbers (current sprint)

| # | Deliverable | Status |
|---|-------------|--------|
| A0 | Outcome contracts (versioned) + CFO sign-off + CPST monthly snapshots | ✅ API + `/contracts` |
| A1 | Outcome stability gate (7d + revert scan) | ✅ API |
| A2 | Team mapping (repo → team) | ✅ API + dashboard |
| A3 | Sync audit log (`sync_runs`) | ✅ API |
| A4 | CPST metric version in API responses | ✅ API |
| A5 | Daily cron endpoint (`POST /v1/cron/sync`) | ✅ API |
| A6 | Vendor key status (OpenAI/Anthropic configured?) | ✅ API |
| A7 | CSV board export | ✅ API + dashboard |
| A8 | Failure cost share (real: reverted / pending) | ✅ API |
| A9 | **Wins panel** — what shipped per PR (`GET /v1/wins`) | ✅ API + dashboard |

**Railway cron:** hit `POST /v1/cron/sync` daily with header `X-Cron-Secret`.

---

## Phase B — Enterprise connect (next)

| # | Deliverable |
|---|-------------|
| B1 | Platform-hosted GitHub OAuth (one app for all customers) |
| B2 | GitHub App + webhooks (merge events) | ✅ App install + `POST /v1/webhooks/github` |
| B3 | SSO (WorkOS / Auth0) + RBAC |
| B4 | Encrypted credentials (KMS) |
| B5 | Connect wizard (org → teams → vendors → coverage %) |

---

## Phase C — Executive product

| # | Deliverable | Status |
|---|-------------|--------|
| C1 | PDF export with methodology appendix | ✅ `GET /v1/reports/export.pdf` |
| C2 | LLM exec narrative (metrics JSON in only) | ✅ `POST /v1/reports/executive` (template fallback; OpenAI optional) |
| C3 | Human approve before export | ✅ `POST /v1/reports/executive/{id}/approve` |
| C4 | Workflow classifier (feature / bugfix / chore) | ✅ rules v1 + CPST by workflow |
| C7 | Persisted attribution graph + benchmark deltas | ✅ `attribution_links`, `/v1/metrics/benchmarks` |
| C5 | Connect wizard (MVP) | ✅ Integrations page |
| C6 | Attribution breakdown UX | ✅ `GET /v1/metrics/attribution` + dashboard banners |

---

## Phase D — Enterprise scale

| # | Deliverable |
|---|-------------|
| D1 | Multi-tenant orgs (`POST /v1/orgs`) |
| D2 | GitHub Enterprise + Copilot metrics |
| D3 | Langfuse OTel ingest |
| D4 | Linear / Jira initiative links |
| D5 | Custom outcome contracts (versioned) |
| D6 | SOC2 path |

---

## API reference (Phase A)

| Method | Path | Auth |
|--------|------|------|
| POST | `/v1/cron/sync` | `X-Cron-Secret` |
| POST | `/v1/jobs/check-reverts` | `X-Api-Key` |
| GET/PUT | `/v1/settings/team-mappings` | GET public / PUT key |
| GET | `/v1/settings/vendors` | public |
| GET | `/v1/sync/history` | public |
| GET | `/v1/reports/export.csv` | API key |
| GET | `/v1/reports/export.pdf` | API key (requires approved narrative) |
| POST | `/v1/reports/executive` | API key |
| GET | `/v1/reports/executive/latest` | API key |
| POST | `/v1/reports/executive/{id}/approve` | API key |
| GET | `/v1/metrics/attribution` | API key |
| GET | `/v1/contracts/active` | API key |
| GET | `/v1/contracts/versions` | API key |
| GET | `/v1/contracts/audit` | API key |
| POST | `/v1/contracts/draft` | API key |
| POST | `/v1/contracts/{id}/publish` | API key |
| POST | `/v1/contracts/{id}/approve` | API key |
| GET | `/v1/metrics/cpst-history` | API key |
| POST | `/v1/jobs/record-cpst-snapshots` | API key |

---

## Env vars (enterprise)

| Variable | Purpose |
|----------|---------|
| `OUTCOME_STABLE_DAYS` | Days before merged PR counts as stable (default `7`, set `0` for pilot) |
| `CRON_SECRET` | Protects `/v1/cron/sync` |
| `CPST_METRIC_VERSION` | Shown on exports (default `1.0`) |
| `OPENAI_API_KEY` / `ANTHROPIC_ADMIN_API_KEY` | Vendor ingest |
