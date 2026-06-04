# Outcome Ledger — Moat strategy

What defensibility exists if token counting and dashboards are commodities?

---

## 1. The moat is NOT

| Weak moat | Why |
|-----------|-----|
| Counting tokens | Langfuse, Helicone, OpenAI bill already do this |
| Another ROI spreadsheet | Olakai, Pay-i, Roiva compete on finance narratives |
| “We integrate 50 tools” | Integrations are table stakes; copyable in quarters |
| LLM-written exec summaries | Commodity models; no lock-in |

---

## 2. The moat IS (build these deliberately)

### A. **Accepted-outcome ontology (deepest)**

You own the **definition of a win** per customer and vertical:

- Eng: PR merged + no revert + prod deploy  
- Support: ticket resolved + no reopen  
- Growth: experiment won + metric threshold  

Once a CFO signs off on *“this is how we measure useful consumer impact,”* switching means **re-baselining years of board metrics**. That’s procedural lock-in, not API lock-in.

**Product work:** versioned outcome contracts, audit trail of definition changes, export that matches what Legal/compliance accepted.

### B. **Attribution graph (data moat over time)**

Link **spend events → people → repos → outcomes → (later) customer metrics** in one graph:

```text
OpenAI project X → engineer Y → PR #4821 → deploy → feature flag Z
```

Every month of history makes **CPST trends** and **failure cost share** more trustworthy. Rebuilding that graph in a competitor takes **re-ingest + re-trust**, not a weekend migration.

**Product work:** immutable `usage_events` / `outcome_events`, confidence scores, manual override with reason (feeds ML later).

### C. **CPST as the internal standard (metric moat)**

If Outcome Ledger becomes the number the **COO uses in town halls** (“cost per shipped fix dropped 18%”), the product owns the **unit of account** for AI engineering — like NPS for loyalty or CAC for growth.

Competitors selling “hours saved” don’t displace a metric already in the **headcount vs tokens** debate (Uber Macdonald framing).

**Product work:** benchmark reports (anonymized vertical percentiles), same formula in every export (versioned, reproducible).

### D. **Workflow intelligence (ML moat — Phase 2+)**

Classifier trained on **customer’s** PR titles, paths, labels → workflow types. Cross-customer patterns (with consent) improve **outlier detection** (“Platform squad retry storm”).

Generic LLMs don’t have your customer’s **accepted-outcome history**.

### E. **Executive trust layer (distribution moat)**

Board-ready PDF where **every dollar traces to integration source + formula version**. Finance approves methodology once → annual renewal.

HITL: human approves narrative before send (reduces “AI made up ROI” risk).

### F. **Benchmark network (network moat — long term)**

Anonymized: “Fintech eng org median CPST = $X; you’re P90.”

More customers → better benchmarks → more customers. Observability vendors rarely publish **outcome-linked** benchmarks.

---

## 3. Moat priority for MVP → Series A

| Phase | Build | Moat strength |
|-------|--------|----------------|
| **Now** | Real ingest + CPST + GitHub outcomes | Medium (useful, copyable in 6 mo) |
| **Now (shipped)** | Versioned outcome contracts + CFO sign-off + monthly CPST snapshots | **High** (foundation) |
| **6 mo** | Multi-tenant orgs + encrypted creds + workflow classifier | **High** |
| **12 mo** | Attribution graph + failure decomposition | **High** |
| **18 mo** | Vertical benchmarks + workflow ML | **Very high** |

---

## 4. What to tell investors in one line

*“We’re not an observability company. We’re the system of record for **cost per accepted customer outcome** — once the COO’s metric lives here, spend tools and LLM vendors stay commodities underneath.”*

---

## 5. Relation to Authon / Agent Money

No moat dependency on Authon. Optional future link (same `task_id`) does not strengthen core defensibility; **outcome ontology + history** does.
