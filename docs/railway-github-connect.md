# Connect Railway to GitHub (Outcome Ledger monorepo)

**Permanent fix for `railpack process exited with an error`:** run once from repo root:

```bash
./scripts/railway-ensure-monorepo.sh
```

See also [RAILWAY_MONOREPO.md](../RAILWAY_MONOREPO.md).

Outcome Ledger is a **monorepo**: one GitHub repo, **three Railway services** (API, dashboard, landing). GitHub is linked **per service**, not once at the project level.

**Repo:** https://github.com/aamirsec6/outcome-ledger  
**Railway project:** `outcome-ledger` (ID `ffec287d-1920-4838-bcbb-fdb10fc8baba`)

---

## Step 0 — Install the Railway GitHub App (one-time)

If Railway shows no repos or “Connect GitHub” fails:

1. Open https://github.com/apps/railway-app/installations/new
2. Sign in as **aamirsec6** (same account that owns the repo).
3. Choose **All repositories** or **Only select** → include **`outcome-ledger`**.
4. Save.

In Railway: **Account Settings** (avatar) → **Connections** → confirm **GitHub** is connected.

---

## Step 1 — API service (`outcome-ledger`)

1. Go to https://railway.com → project **outcome-ledger**.
2. Click the **`outcome-ledger`** service (API — not the dashboard).
3. Open **Settings** (gear tab).
4. Under **Source**:
   - Click **Connect Repo** (or **Change source**).
   - Pick **`aamirsec6/outcome-ledger`**.
   - Branch: **`main`**.
5. Still in **Settings** → **Build** (or **Root Directory**):
   - **Root Directory:** `api`  
     (required — do not leave blank or the build uses the repo root and fails.)
6. **Builder:** Dockerfile (from `api/Dockerfile` via `api/railway.toml`).
7. Click **Deploy** / save.

---

## Step 2 — Dashboard service (`outcome-ledger-dashboard`)

1. Click **`outcome-ledger-dashboard`**.
2. **Settings** → **Source** → **Connect Repo** → **`aamirsec6/outcome-ledger`**, branch **`main`**.
3. **Root Directory:** `dashboard`
4. **Builder:** Dockerfile · **Dockerfile path:** `Dockerfile` (not `dashboard/Dockerfile`)
5. Deploy.

---

## Step 3 — Landing service (`outcome-ledger-landing`)

1. Click **`outcome-ledger-landing`**.
2. **Settings** → **Source** → same repo, branch **`main`**.
3. **Root Directory:** `landing`
4. **Builder:** Dockerfile · **Dockerfile path:** `Dockerfile`
5. Deploy.

---

## Checklist (all services)

| Service | Root directory | Health check | Watch paths (in `railway.toml`) |
|---------|----------------|--------------|----------------------------------|
| `outcome-ledger` | `api` | `/health` | `/api/**` |
| `outcome-ledger-dashboard` | `dashboard` | `/api/health` | `/dashboard/**` |
| `outcome-ledger-landing` | `landing` | `/api/health` | `/landing/**` |

If **Root Directory** is empty, GitHub deploys use **Railpack at repo root** and fail in ~5s with `Railpack could not determine how to build the app` (listing `api/`, `dashboard/`, `landing/`). That is the most common crash.

After root directories are set, only matching paths should redeploy each service (see `watchPatterns` in each folder’s `railway.toml`).

---

## Fix: `railpack process exited with an error`

Railway’s **Railpack** auto-builder often runs when the **root directory** is wrong or the builder isn’t set to Dockerfile. Outcome Ledger must use **Dockerfile** builds.

**Per service (API and dashboard):**

1. **Settings → Build**
   - **Builder:** `Dockerfile` (not Railpack / Nixpacks)
   - **Root Directory:** `api` or `dashboard` (not empty)
   - **Dockerfile path:** `Dockerfile`
2. Redeploy.

Config in repo (when root dir is set correctly, Railway reads these):

- `api/railway.toml` + `api/railway.json` → `builder: DOCKERFILE`
- `dashboard/railway.toml` + `dashboard/railway.json` → `builder: DOCKERFILE`
- `landing/railway.toml` + `landing/railway.json` → `builder: DOCKERFILE`

Optional: GitHub Action `.github/workflows/railway-deploy.yml` deploys only changed paths via `railway up --path-as-root` (add `RAILWAY_TOKEN` secret from Railway → Project → Settings → Tokens).

If logs show `using build driver railpack` and `Detected Node` / `pnpm`, the service is still on Railpack — switch builder in the UI.

**Optional variable** on the service: `RAILWAY_DOCKERFILE_PATH=Dockerfile`

---

## Common mistakes

| Symptom | Fix |
|---------|-----|
| `railpack process exited with an error` | Set root dir + builder **Dockerfile** (see above). |
| “No repositories found” | Install Railway GitHub App (Step 0); grant access to `outcome-ledger`. |
| Connected repo at **project** level only | Open **each service** → Settings → Source → connect repo. |
| Build fails / wrong app | Set **Root Directory** to `api` or `dashboard`, not `/` or empty. |
| Linked **agent-money** or wrong repo | Use **`aamirsec6/outcome-ledger`** only. |
| Deploys don’t run on push | Confirm branch is `main`; check **Deployments** tab for webhook errors. |
| Only one service redeploys | Connect GitHub on **both** services separately. |

---

## Not the same as “Connect GitHub” in the product

| Purpose | Where |
|---------|--------|
| **Auto-deploy code** from GitHub | Railway → service **Settings → Source** (this doc) |
| **Ingest PRs / outcomes** | Outcome Ledger dashboard → **Integrations** → GitHub OAuth (`docs/github-connect.md`) |

You need both for full production: Railway deploys the app; Integrations syncs GitHub data.

---

## Verify

```bash
# After pushing to main, both services should show new deployments in Railway UI.

curl https://outcome-ledger-production.up.railway.app/health
curl https://outcome-ledger-dashboard-production.up.railway.app/api/health
```

---

## CLI deploy (if GitHub UI still fails)

You can deploy without GitHub source linking:

```bash
cd outcome-ledger
railway link   # project: outcome-ledger

railway service outcome-ledger
railway up api --path-as-root --detach

railway service outcome-ledger-dashboard
railway up dashboard --path-as-root --detach
```

GitHub auto-deploy is optional; CLI uploads work for one-off releases.
