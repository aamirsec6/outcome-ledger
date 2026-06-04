# Railway monorepo (Outcome Ledger)

One GitHub repo, **three services**. Each service must use a **root directory** and **Dockerfile** — never Railpack at repo root.

## One-time fix (automated)

```bash
chmod +x scripts/railway-ensure-monorepo.sh
./scripts/railway-ensure-monorepo.sh
```

This sets (via Railway GraphQL API):

| Service | Root directory | Config file |
|---------|----------------|-------------|
| `outcome-ledger` | `api` | `/api/railway.toml` |
| `outcome-ledger-dashboard` | `dashboard` | `/dashboard/railway.toml` |
| `outcome-ledger-landing` | `landing` | `/landing/railway.toml` |

## Why GitHub deploys failed

When **Root Directory** was empty, Railway ran **Railpack** on the whole repo (`api/`, `dashboard/`, `landing/`) and exited with `railpack process exited with an error`. CLI deploys with `railway up landing --path-as-root` worked because they upload only that folder.

## Deploy paths (pick one or combine carefully)

1. **GitHub → Railway** (per-service Source): works after `railway-ensure-monorepo.sh` + watch paths in each `*/railway.toml`.
2. **GitHub Action** `.github/workflows/railway-deploy.yml`: uses `railway up <dir> --path-as-root` (needs `RAILWAY_TOKEN` secret).

Avoid running both on every push if you see duplicate failed+successful deployments.

## Manual UI checklist

If the script cannot run, set each service in Railway **Settings → Build**:

- **Root Directory:** `api` / `dashboard` / `landing`
- **Builder:** Dockerfile
- **Config file:** `/api/railway.toml`, `/dashboard/railway.toml`, `/landing/railway.toml`

See [docs/railway-github-connect.md](docs/railway-github-connect.md).
