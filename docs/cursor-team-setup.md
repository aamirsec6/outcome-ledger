# Cursor Team / Enterprise setup

When you upgrade to **Cursor Team** or **Enterprise**, Outcome Ledger can pull **spend** and **AI vs human line counts** automatically — no more CSV uploads.

## What unlocks

| Cursor plan | Auto spend | AI vs human lines per commit | Exact PR split |
|-------------|------------|------------------------------|----------------|
| Pro ($20) | CSV / MCP only | Estimated (GitHub + spend) | Estimated |
| **Team** | Admin API | AI Code Tracking API (if enabled) | **Exact** when API returns |
| **Enterprise** | Admin API | AI Code Tracking + Blame | **Exact** |

## One-time setup (after you buy Team)

1. [cursor.com/dashboard](https://cursor.com/dashboard) → **Settings** → **Admin API Keys**
2. Create key (`crsr_…`) with **admin:*** scope
3. Outcome Ledger → **Connect** → **Cursor Admin API** → paste key
4. Click **Sync all**

## What sync does

1. **cursorBilling** — daily spend from Cursor usage API → `usage_events`
2. **cursorAiTracking** — per-commit `tabLinesAdded`, `composerLinesAdded`, `nonAiLinesAdded`
3. **codeAttribution** — rolls up to each shipped PR/commit → Overview **AI vs human code** bar

## Verify

```bash
curl -s -H "X-Api-Key: YOUR_OL_KEY" \
  https://outcome-ledger-production.up.railway.app/v1/jobs/cursor-probe | jq .
```

`ok: true` on `/analytics/ai-code/commits` means line-level tracking is live.

## Until you upgrade

- Keep using **MCP** or **CSV upload** for spend ($23/mo works today)
- **Sync** still runs **estimated** AI vs human from GitHub diffs + spend timing
- Estimates are labeled on the dashboard — not hidden as exact

## MCP (optional)

```bash
outcome-ledger-mcp configure --cursor-key crsr_YOUR_KEY
```

(When MCP cursor-key flag is added — cloud dashboard connect is enough for most teams.)

## Troubleshooting

| Error | Fix |
|-------|-----|
| `401/403` on probe | Regenerate Admin API key |
| `404` on AI tracking | Plan may not include AI Code Tracking yet — estimates still run |
| `0% outcome-linked spend` | Run Sync after API connect; tag repos to teams in Settings |
