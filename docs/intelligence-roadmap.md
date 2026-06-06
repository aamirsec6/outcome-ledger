# Intelligence layer roadmap (ML + graph + benchmarks)

**Status:** Phase 2 shipped — learned linker, Langfuse ingest, EWMA anomalies, network benchmarks, override UI.

## Shipped (v0.3 — Phase 1)

| Component | Path | Description |
|-----------|------|-------------|
| **Attribution graph** | `attribution_links` table | usage ↔ outcome with `allocated_usd`, confidence, method |
| **Proportional allocation** | `attribution_engine.py` | Inverse-time weights; orphan CSV links to time windows |
| **Manual overrides** | `POST /v1/attribution/overrides` | Human labels → training data |
| **Workflow classifier** | `workflow_classifier.py` | Rules on PR title/labels/paths |
| **Benchmark report** | `GET /v1/metrics/benchmarks` | CPST + linked % vs prior month snapshot |
| **Sync integration** | `sync_pipeline.py` | Rebuild graph after every sync |
| **Dashboard** | `BenchmarkPanel` on Overview | Verdict + workflow CPST table |

## Shipped (v0.4 — Phase 2)

| Component | Path | Description |
|-----------|------|-------------|
| **Learned linker** | `learned_linker.py` | Logistic regression on overrides + high-confidence links |
| **Interval index** | `usage_time_index.py` | Bisect on sorted usage for fast window queries |
| **Langfuse ingest** | `ingest_langfuse.py` | `trace_id`, `session_id`, `pr_number` on usage events |
| **EWMA anomalies** | `anomalies.py` | Weekly CPST spike/drop alerts in benchmark report |
| **Network benchmarks** | `network_benchmarks.py` | k-anonymized vertical percentiles (`benchmark_contributions`) |
| **Override UI** | `AttributionOverridePanel` | Review low-confidence links; `GET /v1/attribution/candidates` |
| **Graph v3** | `attribution_engine.py` | ML-weighted proportional allocation when linker trained |

## Next (Phase 3)

1. **Linear/Jira linker** — ticket ↔ PR ↔ trace graph  
2. **XGBoost linker** — replace logistic when sample count > 500  
3. **LLM anomaly explainer** — natural-language CPST spike narratives  
4. **Federated benchmarks** — opt-in cross-org cohorts with differential privacy

## Regenerate graph

```bash
curl -X POST https://YOUR-API/v1/sync -H "X-Api-Key: ..."
# or
curl -X POST https://YOUR-API/v1/attribution/rebuild -H "X-Api-Key: ..."
```
