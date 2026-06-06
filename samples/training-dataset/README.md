# Linker training dataset

Synthetic spend + PR outcomes for training and evaluating the Outcome Ledger attribution linker.

## Files

| File | Rows | Purpose |
|------|------|---------|
| `usage_events.csv` | 18 | Daily AI spend (Cursor, OpenAI, Anthropic) with repo, PR, team |
| `outcomes.csv` | 12 | Merged PRs across 3 teams |
| `ground_truth_links.csv` | 22 | Known correct/incorrect spend↔outcome pairs (train + test split) |

## Run locally

From repo root (uses your local API database — `api/.env` or `DATABASE_URL`):

```bash
cd api
python scripts/train_linker_eval.py --reset
```

Expected output:

- Seeds a **Linker Training Sandbox** org (does not touch your production org)
- Rebuilds attribution graph
- Trains logistic linker (needs `scikit-learn` in API env)
- Prints holdout **accuracy / precision / recall** on the test split
- Prints sandbox **CPST**

JSON only:

```bash
python scripts/train_linker_eval.py --reset --json
```

## Install sklearn (if training skips)

```bash
pip install scikit-learn
```

## What “good” looks like

| Metric | Target |
|--------|--------|
| Training samples | ≥ 8 (auto from train overrides + high-confidence links) |
| Holdout accuracy | ≥ 0.85 on this synthetic set |
| Holdout recall | High on repo+PR+team positives |
| Holdout precision | Low false positives on wrong-repo / off-window pairs |

## Customize

1. Add rows to `usage_events.csv` and `outcomes.csv` (keep `external_id` unique).
2. Label pairs in `ground_truth_links.csv`:
   - `label=1` → spend should link to that PR
   - `label=0` → should not link
   - `split=train` → used for manual overrides that bootstrap training
   - `split=test` → held out for evaluation only
3. Re-run `--reset`.

## Production vs sandbox

This script writes only to the **Linker Training Sandbox** organization. Your live Railway workspace is unchanged.
