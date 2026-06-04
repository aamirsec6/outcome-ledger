# Clerk multi-tenant auth

The dashboard uses [Clerk](https://clerk.com) for sign-in. Each Clerk user (or Clerk Organization) maps to one **Outcome Ledger workspace** with isolated data and integration secrets.

## 1. Create a Clerk application

1. [dashboard.clerk.com](https://dashboard.clerk.com) → **Add application**
2. Enable **Organizations** if you want team workspaces (recommended for B2B)
3. Copy **Publishable key** and **Secret key**

## 2. Dashboard env (`outcome-ledger-dashboard`)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_ISSUER=https://YOUR-INSTANCE.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=https://outcome-ledger-dashboard-production.up.railway.app
OUTCOME_LEDGER_API_URL=https://outcome-ledger-production.up.railway.app
```

Do **not** set `OUTCOME_LEDGER_API_KEY` on the dashboard when using Clerk (that mode is for legacy single-tenant).

## 3. API env (`outcome-ledger`)

```env
CLERK_SECRET_KEY=sk_live_...          # same secret — verifies JWTs
CLERK_JWT_ISSUER=https://YOUR-INSTANCE.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=https://outcome-ledger-dashboard-production.up.railway.app
```

Optional: keep `OUTCOME_LEDGER_API_KEY` for cron/admin only.

## 4. User flow

1. User visits dashboard → Clerk **sign-in** / **sign-up**
2. Redirect to **`/onboarding`** → workspace auto-provisioned via `POST /v1/tenants/clerk-sync`
3. User connects OpenAI, GitHub, runs sync
4. All API calls send `Authorization: Bearer <clerk_session_token>`

## 5. Clerk Organizations

When a user selects a Clerk org, the JWT includes `org_id`. All members of that Clerk org share one Outcome Ledger workspace.

Personal accounts (no Clerk org) get a **personal workspace** per `clerk_user_id`.

## 6. Local dev

```bash
# Terminal 1 — API
cd api && source .venv/bin/activate
pip install -r requirements.txt
# add CLERK_* to api/.env
uvicorn app.main:app --reload --port 8090

# Terminal 2 — Dashboard
cd dashboard
# add Clerk keys to .env.local
npm run dev
```

Open `http://localhost:3001` → sign in → onboarding.

## 7. Fallback modes

| Config | Behavior |
|--------|----------|
| Clerk keys set | Clerk auth + per-tenant workspaces |
| `OUTCOME_LEDGER_API_KEY` on dashboard only | Legacy single-tenant |
| Neither | Cookie + `ol_` key via `/onboarding` |

See also [`multi-tenant.md`](./multi-tenant.md).
