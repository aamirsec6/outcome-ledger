# Intelligence layer roadmap (ML + graph + benchmarks)

**Status:** Phase 1 shipped in API — persisted attribution graph, workflow classifier, benchmark deltas.

## Shipped (v0.3)

| Component | Path | Description |
|-----------|------|-------------|
| **Attribution graph** | `attribution_links` table | usage ↔ outcome with `allocated_usd`, confidence, method |
| **Proportional allocation** | `attribution_engine.py` | Inverse-time weights; orphan CSV links to time windows |
| **Manual overrides** | `POST /v1/attribution/overrides` | Human labels → training data |
| **Workflow classifier** | `workflow_classifier.py` | Rules on PR title/labels/paths |
| **Benchmark report** | `GET /v1/metrics/benchmarks` | CPST + linked % vs prior month snapshot |
| **Sync integration** | `sync_pipeline.py` | Rebuild graph after every sync |
| **Dashboard** | `BenchmarkPanel` on Overview | Verdict + workflow CPST table |

## Next (Phase 2)

1. **Learned linker** — XGBoost on override + high-confidence links  
2. **Interval index** — faster rebuild for 100k+ usage rows  
3. **Langfuse OTel** — `trace_id`, `repo`, `pr_number` on usage events  
4. **Anomaly detection** — EWMA on weekly CPST  
5. **Network benchmarks** — anonymized vertical percentiles (k-anonymity)

## Regenerate graph

```bash
curl -X POST https://YOUR-API/v1/sync -H "X-Api-Key: ..."
# or
curl -X POST https://YOUR-API/v1/attribution/rebuild -H "X-Api-Key: ..."
```
