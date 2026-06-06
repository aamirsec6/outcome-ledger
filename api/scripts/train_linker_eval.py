#!/usr/bin/env python3
"""Seed synthetic training data, train the linker, and report holdout metrics."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.attribution_engine import add_manual_override, rebuild_attribution_graph
from app.db import SessionLocal, init_db
from app.learned_linker import link_probability, train_linker_model
from app.metrics import build_overview
from app.models import (
    AttributionLink,
    LinkerModel,
    Organization,
    OutcomeEvent,
    TeamMapping,
    UsageEvent,
)

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "samples" / "training-dataset"
SANDBOX_NAME = "Linker Training Sandbox"


def _parse_day(raw: str) -> datetime:
    return datetime.strptime(raw[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)


def _load_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _get_or_create_sandbox(db) -> str:
    org = db.query(Organization).filter(Organization.name == SANDBOX_NAME).first()
    if org:
        return org.id
    org = Organization(name=SANDBOX_NAME)
    db.add(org)
    db.flush()
    return org.id


def _clear_sandbox(db, org_id: str) -> None:
    db.query(AttributionLink).filter(AttributionLink.org_id == org_id).delete(
        synchronize_session=False
    )
    db.query(LinkerModel).filter(LinkerModel.org_id == org_id).delete(
        synchronize_session=False
    )
    db.query(UsageEvent).filter(UsageEvent.org_id == org_id).delete(
        synchronize_session=False
    )
    db.query(OutcomeEvent).filter(OutcomeEvent.org_id == org_id).delete(
        synchronize_session=False
    )
    db.query(TeamMapping).filter(TeamMapping.org_id == org_id).delete(
        synchronize_session=False
    )
    db.flush()


def seed_dataset(db, org_id: str) -> dict:
    usage_rows = _load_csv(DATASET / "usage_events.csv")
    outcome_rows = _load_csv(DATASET / "outcomes.csv")
    truth_rows = _load_csv(DATASET / "ground_truth_links.csv")

    for repo, team in [
        ("acme/platform-api", "eng-platform"),
        ("acme/mobile-app", "eng-mobile"),
        ("acme/data-pipeline", "eng-data"),
    ]:
        db.add(TeamMapping(org_id=org_id, pattern=repo, team_id=team))

    usage_by_ext: dict[str, UsageEvent] = {}
    for row in usage_rows:
        day = _parse_day(row["date"])
        ev = UsageEvent(
            org_id=org_id,
            external_id=row["external_id"],
            source=row["source"],
            period_start=day,
            period_end=day.replace(hour=23, minute=59, second=59),
            cost_usd=float(row["cost_usd"]),
            repo=row.get("repo") or None,
            pr_number=int(row["pr_number"]) if row.get("pr_number") else None,
            team_id=row.get("team_id") or None,
            user_id=row.get("user_id") or None,
            trace_id=row.get("trace_id") or None,
        )
        db.add(ev)
        usage_by_ext[row["external_id"]] = ev

    outcome_by_ext: dict[str, OutcomeEvent] = {}
    for row in outcome_rows:
        day = _parse_day(row["date"])
        ev = OutcomeEvent(
            org_id=org_id,
            external_id=row["external_id"],
            outcome_type=row.get("outcome_type") or "pr_merged_stable",
            occurred_at=day.replace(hour=18, minute=0, second=0),
            repo=row["repo"],
            pr_number=int(row["pr_number"]) if row.get("pr_number") else None,
            team_id=row.get("team_id") or None,
            title=row.get("title") or None,
            accepted=True,
        )
        db.add(ev)
        outcome_by_ext[row["external_id"]] = ev

    db.flush()

    train_overrides = 0
    for row in truth_rows:
        if row.get("split") != "train" or int(row["label"]) != 1:
            continue
        usage = usage_by_ext.get(row["usage_external_id"])
        outcome = outcome_by_ext.get(row["outcome_external_id"])
        if not usage or not outcome:
            continue
        add_manual_override(
            db,
            org_id,
            usage_event_id=usage.id,
            outcome_event_id=outcome.id,
            reason=row.get("notes") or "training seed",
        )
        train_overrides += 1

    db.flush()
    return {
        "usageEvents": len(usage_rows),
        "outcomes": len(outcome_rows),
        "groundTruthPairs": len(truth_rows),
        "trainOverrides": train_overrides,
    }


def _eval_holdout(db, org_id: str, truth_rows: list[dict]) -> dict:
    usage_by_ext = {
        r.external_id: r
        for r in db.query(UsageEvent).filter(UsageEvent.org_id == org_id).all()
    }
    outcome_by_ext = {
        r.external_id: r
        for r in db.query(OutcomeEvent).filter(OutcomeEvent.org_id == org_id).all()
    }

    test_rows = [r for r in truth_rows if r.get("split") == "test"]
    if not test_rows:
        return {"ok": False, "reason": "no test rows"}

    threshold = 0.5
    tp = fp = tn = fn = 0
    details: list[dict] = []

    for row in test_rows:
        usage = usage_by_ext.get(row["usage_external_id"])
        outcome = outcome_by_ext.get(row["outcome_external_id"])
        if not usage or not outcome:
            continue
        expected = int(row["label"]) == 1
        prob = link_probability(db, org_id, usage, outcome)
        predicted = prob is not None and prob >= threshold
        if expected and predicted:
            tp += 1
        elif expected and not predicted:
            fn += 1
        elif not expected and predicted:
            fp += 1
        else:
            tn += 1
        details.append(
            {
                "pair": f"{row['usage_external_id']} -> {row['outcome_external_id']}",
                "expected": expected,
                "predicted": predicted,
                "probability": round(prob, 4) if prob is not None else None,
                "notes": row.get("notes"),
            }
        )

    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0

    return {
        "ok": True,
        "threshold": threshold,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "accuracy": round(accuracy, 3),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "details": details,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear prior sandbox rows before seeding",
    )
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON only")
    args = parser.parse_args()

    if not DATASET.exists():
        print(f"Dataset not found: {DATASET}", file=sys.stderr)
        return 1

    init_db()
    db = SessionLocal()
    try:
        org_id = _get_or_create_sandbox(db)
        if args.reset:
            _clear_sandbox(db, org_id)

        seed_stats = seed_dataset(db, org_id)
        graph = rebuild_attribution_graph(db, org_id, lookback_days=120)
        train_result = train_linker_model(db, org_id)
        db.commit()

        truth_rows = _load_csv(DATASET / "ground_truth_links.csv")
        holdout = _eval_holdout(db, org_id, truth_rows)
        overview = build_overview(db, org_id, lookback_days=120)

        report = {
            "sandboxOrg": SANDBOX_NAME,
            "orgId": org_id,
            "seed": seed_stats,
            "attributionGraph": graph,
            "linkerTraining": train_result,
            "holdoutEval": holdout,
            "overview": {
                "totalSpendUsd": overview.get("totalSpendUsd"),
                "stableOutcomes": overview.get("stableOutcomes"),
                "orgCpstUsd": overview.get("orgCpstUsd"),
                "attributedSpendPct": overview.get("attributedSpendPct"),
            },
        }

        if args.json:
            print(json.dumps(report, indent=2, default=str))
        else:
            print("=== Outcome Ledger linker training eval ===\n")
            print(f"Sandbox org: {SANDBOX_NAME} ({org_id})")
            print(
                f"Seeded {seed_stats['usageEvents']} usage rows, "
                f"{seed_stats['outcomes']} outcomes, "
                f"{seed_stats['trainOverrides']} train overrides"
            )
            print(
                f"\nAttribution graph: {graph.get('created')} links "
                f"({graph.get('usageEvents')} usage x {graph.get('outcomes')} outcomes)"
            )
            print(f"\nLinker training: {json.dumps(train_result, indent=2)}")
            if holdout.get("ok"):
                print(
                    f"\nHoldout eval (test split, threshold={holdout['threshold']}): "
                    f"accuracy={holdout['accuracy']}, precision={holdout['precision']}, "
                    f"recall={holdout['recall']} "
                    f"(tp={holdout['tp']} fp={holdout['fp']} tn={holdout['tn']} fn={holdout['fn']})"
                )
                print("\nTest pair details:")
                for row in holdout["details"]:
                    mark = "OK" if row["expected"] == row["predicted"] else "MISS"
                    print(
                        f"  [{mark}] {row['pair']}: expected={row['expected']} "
                        f"prob={row['probability']} — {row['notes']}"
                    )
            print(
                f"\nSandbox CPST: ${overview.get('orgCpstUsd')} "
                f"({overview.get('totalSpendUsd')} spend / "
                f"{overview.get('stableOutcomes')} wins)"
            )
            print(f"\nDataset path: {DATASET}")
            print("Re-run: python api/scripts/train_linker_eval.py --reset")

        return 0 if train_result.get("ok") and holdout.get("ok") else 2
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
