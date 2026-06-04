# Multi-tenant workspaces

Outcome Ledger supports **isolated workspaces** (tenants). Each tenant has:

- Its own **organization** row and data (`org_id` on all facts)
- Its own **API key** (`ol_…`) for dashboard + API access
- Its own **integration secrets** (OpenAI, Anthropic, GitHub) stored in `provider_connections`
- Its own **onboarding wizard** at `/onboarding`

## Modes

| Deploy mode | How it works |
|-------------|----------------|
| **Clerk (recommended)** | Clerk sign-in on dashboard; JWT → API resolves workspace. See [`clerk-setup.md`](./clerk-setup.md). |
| **Shared (legacy)** | Set `OUTCOME_LEDGER_API_KEY` on API + dashboard. One default org; middleware skips onboarding. |
| **Cookie + ol_ key** | Omit Clerk and dashboard API key; manual workspace at `/onboarding`. |

## Create a workspace

```bash
curl -s -X POST "$API/v1/tenants/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Eng","companyName":"Acme Inc"}' | jq .
```

Response includes `apiKey` (prefix `ol_`) — **shown once**. Use it as `X-Api-Key` on all API calls.

## Per-tenant secrets

```bash
curl -s -X PUT "$API/v1/connections/openai" \
  -H "X-Api-Key: $TENANT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-admin-...","openaiOrgId":"org-..."}'
```

Sync and ingest read credentials for **that** org only.

## Dashboard flow

1. User opens dashboard (no platform `OUTCOME_LEDGER_API_KEY`)
2. Middleware redirects to `/onboarding`
3. **Create workspace** or **Sign in** with existing `ol_` key
4. Wizard: company → OpenAI → GitHub → first sync
5. Cookie set → full dashboard access

## Per-tenant dashboard URL (phase 2)

Today: one dashboard hostname, many tenants via cookie.

Options for dedicated URLs:

- **Subdomain:** `acme.outcome-ledger.app` → tenant slug in middleware
- **Separate Railway service** per customer with only `OUTCOME_LEDGER_API_URL` + no shared secrets

## API reference

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /v1/tenants/register` | Public* | Create org + `ol_` key |
| `GET /v1/tenants/me` | Tenant key | Workspace info |
| `GET /v1/onboarding/status` | Tenant key | Wizard checklist |
| `PUT /v1/connections/openai` | Tenant key | Store OpenAI creds |
| `PUT /v1/connections/anthropic` | Tenant key | Store Anthropic creds |
| `GET /v1/connect/github/start` | Tenant key | OAuth URL for this org |

\*Disable with `TENANT_REGISTRATION_ENABLED=false` on the API service.

## Environment

| Variable | Service | Notes |
|----------|---------|-------|
| `TENANT_KEY_PEPPER` | API | Optional; hashes `ol_` keys (defaults to platform API key) |
| `TENANT_REGISTRATION_ENABLED` | API | Default `true` |
| `OUTCOME_LEDGER_API_KEY` | API + dashboard | Platform admin / legacy single-tenant |

Do **not** set platform `OPENAI_*` on Railway if you want pure per-tenant secrets — tenants configure in onboarding.
