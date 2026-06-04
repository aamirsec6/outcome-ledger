# OpenAI spend tracking

Outcome Ledger needs **USD billing data** for CPST. How you connect depends on your key type.

---

## Service account key (most common)

A **service account** key is tied to **one project** (`proj_...`). It runs your app; it is **not** the same as an Organization Admin key.

### Step 1 — Add to `api/.env` or Railway

```env
OPENAI_API_KEY=sk-...          # service account secret
OPENAI_PROJECT_ID=proj_...       # project Settings → General
OPENAI_ORG_ID=org-...          # org settings (you likely have this)
```

### Step 1b — Enable **Usage read** on the key (required)

OpenAI returned `Missing scopes: api.usage.read` for many service account keys.

1. [API keys](https://platform.openai.com/settings/organization/api-keys)  
2. Edit your service account key (or create a new one)  
3. Enable **Read usage** / `api.usage.read`  
4. Save, update `OPENAI_API_KEY` if you rotated the secret  

Find **Project ID:** your project → **Settings** → General → `proj_...`

### Step 2 — Test if billing API works

```bash
curl -s -H "X-Api-Key: YOUR_OUTCOME_LEDGER_API_KEY" \
  https://outcome-ledger-production.up.railway.app/v1/jobs/openai-probe | jq .
```

| `costsApi.ok` | Meaning |
|---------------|---------|
| `true` | Auto-sync works — run **Sync all** in the dashboard |
| `false` (403/404) | Key cannot read billing — use **CSV import** below |

Many service account keys return **403/404** on `/v1/organization/costs`. That is normal.

---

## If auto-sync does not work: CSV import (works with any key)

1. [OpenAI Usage](https://platform.openai.com/usage) or billing export  
2. Build a CSV with at least:

```csv
date,cost_usd
2026-06-01,42.50
2026-06-02,18.20
```

3. Dashboard → **Integrations** → **OpenAI spend (CSV)** → upload  
4. **Sync all** (for GitHub outcomes)

Optional columns: `team_id`, `source` (defaults to `openai`).

---

## Organization Admin key (full auto-sync)

For hands-free ingest without CSV:

1. [Organization → API keys](https://platform.openai.com/settings/organization/api-keys)  
2. Create a key with access to **organization billing / costs** (Admin), not only inference  
3. Set `OPENAI_API_KEY` + `OPENAI_ORG_ID` (no project ID required)

```bash
curl -s -X POST -H "X-Api-Key: YOUR_KEY" \
  https://outcome-ledger-production.up.railway.app/v1/jobs/test-openai | jq .
```

Expected: `{ "ok": true, "inserted": N }`

---

## Summary

| You have | Do this |
|----------|---------|
| Service account + `proj_...` | Set `OPENAI_PROJECT_ID`, run `openai-probe`, then sync or CSV |
| Admin / billing key | Set `OPENAI_ORG_ID`, run sync |
| Only inference key | Use **CSV import** on Integrations |

---

## Railway variables (API service)

| Variable | Service account | Admin key |
|----------|-----------------|-----------|
| `OPENAI_API_KEY` | ✅ | ✅ |
| `OPENAI_PROJECT_ID` | ✅ recommended | optional |
| `OPENAI_ORG_ID` | optional | ✅ recommended |
