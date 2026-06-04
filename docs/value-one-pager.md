# Outcome Ledger — Product one-pager & market research

**Working name:** Outcome Ledger

**Independence:** Standalone product and brand — **not** part of Authon or Agent Money. No shared roadmap, passport, MCP, or governance integrations in v1. (This doc may live in the agent-money repo temporarily for drafting only.)

**Date:** June 2026 · **Anchor customer narrative:** Uber COO Andrew Macdonald, Rapid Response / Masters of Scale (2026)

---

## 1. The Uber moment (why this exists)

Uber is not anti-AI. ~**95%** of engineers use AI monthly; **~70%** of committed code can be AI-assisted; they **burned through the full 2026 Claude Code / Cursor budget in ~4 months** and imposed per-engineer caps (~$1,500/month reported).

**Andrew Macdonald (president & COO)** said the quiet part out loud:

> *"That link is not there yet, right? … It's very hard to draw a line between one of those stats and, 'Okay, now we're actually producing 25 percent more useful consumer features.'"*

> *"You talk to your senior engineering leaders … projects that moved above the line because of productivity gains … **that link is not there yet**."*

> Finance will compare **token consumption and cost vs headcount** — without a line to **useful features for riders/drivers/merchants**, *"that trade becomes harder to justify."*

**Insight:** Adoption metrics are becoming this decade’s **page views** — large, directionally “up and to the right,” weakly tied to **customer or P&L outcomes**. Uber’s pain is **engineering AI ROI**, not “we need another token dashboard.”

**Product implication:** Outcome Ledger answers *“what got better for the customer — and what did it cost per real win?”* That is a different category from spend governance or agent identity tools (e.g. Agent Money, Authon) — competitors at most, not building blocks.

---

## 2. Problem statement

| Layer | What orgs track today | What leadership asks |
|-------|----------------------|----------------------|
| **Inputs** | Tokens, licenses, % engineers on Copilot/Claude, commits via AI | — |
| **Activity** | PRs, lines of code, agent runs, tool calls | — |
| **Outcomes** | *(fragmented)* | Ship velocity **for users**, defects, NPS, revenue, handle time |
| **Unit economics** | *(rare)* | **Cost per successful outcome** by workflow / team |

**Failure modes:**

1. **10× code ≠ 10× value** — review debt, wrong features, instability (DORA 2025: AI linked to higher throughput but **stability still suffers** for many teams).
2. **Agentic >> chat economics** — one prompt vs 500k-token loops; budgets blow before attribution exists.
3. **ROI theater** — 72% of execs claim “ROI metrics” for GenAI (Wharton), but **&lt;1% report ≥20% ROI**; most report **1–5%**, often **productivity proxies** not customer impact (Forbes/RGP/BCG surveys, 2025–2026).
4. **Tool sprawl** — OpenAI + Anthropic + Cursor + Claude Code + internal agents → **no single “customer value receipt.”**

---

## 3. Product thesis

**Outcome Ledger** is the **value accounting layer** for AI-assisted work:

```text
Workflow (e.g. "ship checkout fix", "resolve L2 ticket")
  → Work unit (PR, deploy, ticket_id, experiment)
    → AI cost (tokens, tools, agent runs, human review)
      → Outcome signal (merged w/o revert, CSAT, feature shipped, metric delta)
        → Report: cost per accepted outcome (CAPO / CPST)
```

**Hero metric (industry converging on this):**

- **Cost per Successful Task (CPST)** or **Cost per Accepted Outcome (CAPO)**  
  `fully_loaded_spend(workflow) / count(accepted_outcomes)`  
  Numerator includes **failed runs, retries, escalations**; denominator only **accepted** outcomes (OptyxStack, Azalio FinOps, Codebridge 2026).

**One-liner for buyers:**  
*Stop reporting AI adoption. Report what became better for the customer — and the fully loaded cost per win.*

---

## 4. MVP scope (90 days)

**Wedge:** **Engineering / platform leaders** (Uber-shaped buyer) — connect **AI coding spend** to **shippable, customer-visible outcomes**.

| In scope | Out of scope (v1) |
|----------|-------------------|
| Ingest: Cursor/Claude Code billing exports, OpenAI/Anthropic org usage, optional Langfuse OTel | Full PLM / revenue attribution |
| Link: `task_id` / PR / deploy / feature flag from CI (GitHub, Linear) | Replace Jira/Amplitude |
| Outcome defs: merged PR (no revert 7d), deploy to prod, optional manual “customer feature” tag | Real-time rider NPS (Uber-internal) |
| Dashboard: CPST by team, workflow, tool; failure cost share | Agent wallets, payment policy, spend authorization |
| Export: board-ready PDF / CSV — “$X per shipped fix” | Any Authon / Agent Money integration (deferred indefinitely) |

**Integrations (v1):** GitHub, LLM vendor billing, optional Langfuse — **only** standard SaaS APIs. No dependency on Authon passport, MCP, or audit ledger.

---

## 5. Personas & buyers

| Persona | Pain | Budget holder |
|---------|------|---------------|
| **COO / President (ops)** | Can’t tie AI eng spend to consumer features | OpEx + headcount trade |
| **CTO / VP Eng** | Budget blown in Q1; needs caps + proof for renewals | Tooling + cloud |
| **CFO / FP&A** | 1.7% of revenue → AI spend (BCG 2026); only 14% CFOs see *substantial* ROI today (RGP) | Consolidated AI line item |
| **Eng director** | “25% AI commits” ≠ projects above the cut line | Team productivity |

**Champion:** Staff+ platform eng or **AI FinOps** role (emerging). **Economic buyer:** CFO or CTO. **Uber is the logo story**, not the only ICP — any **>$1B tech** with org-wide coding agents fits.

---

## 6. Market research — demand

### 6.1 Spend and urgency (tailwind)

| Signal | Source |
|--------|--------|
| Enterprise AI spend → **~$1.5T (2025)** → **$2T+ (2026)** (Gartner via CFO Dive) | Wharton / Gartner |
| **1.7% of revenue** planned for AI in 2026 (2× vs 2025) | BCG AI Radar 2026 |
| **56%** of CFOs raising enterprise AI spend **>15%**; **42%** expect **>30%** over 2 years | Bain CFO survey |
| **88%** expect to **increase** GenAI spend next year | Wharton (800+ leaders) |
| **61%** of senior leaders feel **more pressure to prove AI ROI** than a year ago | Kyndryl 2025 |
| **53%** of investors want positive AI returns within **≤6 months** | Teneo Vision 2026 |
| **65%** of CEOs report **misalignment with CFO** on AI long-term value | Wndyr / CEO surveys |
| **Only 14%** of CFOs report **substantial ROI today**; **66%** expect it in 2 years (expectations gap) | RGP CFO Research 2026 |
| **&lt;1%** report **≥20% ROI**; **53%** report **1–5%** | Forbes / aggregated exec surveys |
| **Only 36%** of CFOs feel assured they can achieve **meaningful** AI outcomes | Gartner finance chiefs |

**Demand conclusion:** Spend is **committed and rising**; **proof is lagging**. 2026 is widely described as **“show me the money”** for enterprise AI — aligns exactly with Macdonald’s comments.

### 6.2 Problem validation (Uber + DORA)

| Evidence | Implication |
|----------|-------------|
| Macdonald: no line from stats → **25% more useful consumer features** | Need **outcome-linked** metrics, not adoption |
| Uber CTO: need metrics for **quality and business impact**, not volume — **after** budget spent | Retrofit market exists |
| DORA 2025: **90%** use AI; **80%+** feel more productive; **org effects mixed**; focus on **outcomes**, small batches | Google validates “amplifier” — measurement must be organizational |
| DORA: **large code volume isn’t the most important metric** | Product must not sell “more LOC” |

### 6.3 Willingness to pay (proxy)

- Enterprises already pay **$80–$8k+/mo** for observability (Langfuse/Helicone/LangSmith at scale).
- Emerging **ROI platforms** (Olakai, Pay-i, Roiva, AIXXEN) sell **finance-facing** narratives — category forming.
- **Consulting pull-through:** Pay-i + AWS GenAI Innovation Center, Trace3 — buyers want **measurement layer at PoC** to scale.

**Estimate (bottom-up SAM for wedge):**

- ~5,000–15,000 global enterprises with **>500 engineers** and **org-wide coding AI** (Uber-shaped).
- If **$50k–$250k ACV** for outcome + cost platform (less than observability at scale, more than point SaaS): **$250M–$1.5B SAM** for eng-outcome wedge alone.
- Expand to **support agents, sales copilots** → multi-billion **TAM** adjacent to FinOps + product analytics.

---

## 7. Market research — gap

### 7.1 What exists (competitive landscape)

| Category | Players | What they measure | Gap vs Uber question |
|----------|---------|-------------------|----------------------|
| **LLM observability** | Langfuse, Helicone, LangSmith, Phoenix | Tokens, traces, cost per team/feature | **Cost**, not **customer value**; weak “accepted outcome” |
| **AI FinOps / gateways** | LiteLLM, CloudZero, Mavvrik | Budgets, anomalies, K8s/cloud AI tax | Infra bill, not “useful feature shipped” |
| **ROI / portfolio SaaS** | Olakai, Pay-i, Roiva, AIXXEN, botanu | Use-case ROI, hours saved, board reports | Often **self-reported value** or **finance templates**; thin **CI/deploy/customer** link |
| **Agent economics** | LensAI, Paid.ai, Valmi | Margin per session, outcome billing | Strong for **B2B agent SaaS**; less for **internal eng → consumer product** |
| **Methodology content** | OptyxStack, Azalio (CAPO/CPST) | Unit economics frameworks | **No default system of record** |
| **Spend governance** | Agent Money, Authon, corporate cards | Policy, audit, authorized spend | **Authorization**, not **value proof** (different category; not a dependency) |

**White space:** A system that **natively joins**:

1. **Workflow identity** (PR, deploy, initiative, `task_id`)
2. **Fully loaded AI cost** (tools + failures + review)
3. **Accepted outcome definition** (revert-safe merge, prod deploy, product metric)
4. **Executive narrative** Macdonald can use vs headcount

…without requiring the customer to build a data warehouse science project.

### 7.2 Why incumbents don’t fully solve it

- **Observability vendors** stop at **trace cost** — customer NPS / feature adoption lives in **Amplitude / internal warehouses**.
- **ROI SaaS** often aggregates **licenses + surveys** — engineers don’t trust “hours saved” spreadsheets (Uber eng leaders already skeptical).
- **GitHub Copilot analytics** show activity — **not** “useful consumer features.”
- **Consultancies** (McKinsey, etc.) sell frameworks — **not continuous ledger**.

### 7.3 Defensible differentiation (Outcome Ledger)

| Pillar | Differentiator |
|--------|----------------|
| **Metric** | CPST / CAPO as **default**, not token dashboards |
| **Outcome gate** | Explicit **acceptance** (revert, deploy, ticket resolved) — failures in numerator |
| **Workflow-first** | “Checkout fix” / “L2 resolution” not “OpenAI invoice” |
| **Standalone** | Own repo, brand, data model — no Authon/Agent Money stack |
| **Buyer** | COO/CFO **and** CTO — same slide: cost **and** customer link |

---

## 8. Independence from Authon & Agent Money

**Principle:** Outcome Ledger is its **own company/product line**, not a module, plugin, or “Authon Proof.”

| Rule | Rationale |
|------|-----------|
| **Separate repo** | [`github.com/aamirsec6/outcome-ledger`](https://github.com/aamirsec6/outcome-ledger) — not under `agent-money/` |
| **Separate brand & domain** | No “by Authon,” no shared landing or Clerk tenant |
| **Separate data store** | Workflows, outcomes, CPST — not `audit_ledger_v2` or passport JWT |
| **No v1 integrations** | Do not call Authon MCP, governor, or Agent Money APIs |
| **Separate GTM** | Buyer story = customer value accounting; not agent spend compliance |

```text
  Outcome Ledger                    Authon / Agent Money
  ─────────────────                 ────────────────────
  CPST / CAPO                       Spend policy & audit
  GitHub + billing ingest           Cards, wallets, MCP
  “Useful consumer features”        “Was this payment allowed?”

        NO shared platform layer in v1
```

If both exist in the same founder portfolio later, they remain **sibling products** (like Stripe Treasury vs Stripe Billing), not one platform — unless a future **customer-initiated** integration makes sense.

---

## 9. Go-to-market

**Phase 1 — Design partners (3–5 logos)**  
Uber-shaped: large eng org, coding agents, public ROI pressure. Offer **free 8-week diagnostic**: ingest 90 days billing + GitHub → first **CPST by squad** report.

**Phase 2 — SKU**  
- **Starter:** GitHub + one LLM vendor + dashboard  
- **Growth:** Langfuse OTel, Linear/Jira, Amplitude webhook for outcome events  
- **Enterprise:** SSO, custom outcome defs, CFO export pack

**Messaging (vs Macdonald):**  
*"You have the adoption chart. We'll give you the chart your COO asked for: cost per feature your customers actually received."*

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Outcomes are company-specific | Workflow templates + configurable acceptance gates |
| Causation ≠ correlation | Report **paired** metrics; honest “leading indicator” language |
| Olakai et al. move downstack | Focus **engineering→customer** chain; deeper CI than generic ROI spreadsheets |
| Data access friction | Start with **billing CSV + GitHub App** — no agent instrumentation day 1 |
| Privacy | No prompt storage by default; aggregate $ + outcome IDs |

---

## 11. Demand scorecard (summary)

| Dimension | Score (1–5) | Notes |
|-----------|-------------|-------|
| **Pain intensity** | 5 | Public C-suite quotes; budget overruns |
| **Budget availability** | 5 | AI line item growing double digits |
| **Urgency** | 5 | 2026 = proof year; investor pressure |
| **Competition** | 3 | Fragmented; no clear winner on eng→customer |
| **Willingness to pay** | 4 | Proven adjacent spend (observability, ROI SaaS) |
| **Ability to deliver MVP** | 4 | Integrations well-defined; outcome defs hardest |
| **Overall opportunity** | **Strong** | **Fully standalone** — no Authon coupling |

---

## 12. Recommended next steps

1. **Validate with 5 CTO/CFO interviews** — script Macdonald quote; ask what outcome they’d accept for eng AI.
2. **Build diagnostic** — GitHub + Anthropic/OpenAI usage → one **CPST** table in 2 weeks.
3. **Name + domain** — Outcome Ledger / Proofline / similar (no Authon prefix).
4. **Repo strategy** — **new repository** outside agent-money; move this doc when the repo exists.
5. **Pilot metric contract** — e.g. *accepted outcome = PR merged + no revert in 7d + deployed to prod within 14d*.

---

## References (external)

- [The Verge — Uber AI investment harder to justify](https://www.theverge.com/transportation/937116/uber-ai-investment-hard-to-justify)
- [Gizmodo — Macdonald productivity returns lag](https://gizmodo.com/ai-investment-is-harder-to-justify-as-productivity-returns-lag-uber-coo-says-2000763514)
- [DORA 2025 — AI-assisted software development](https://research.google/pubs/dora-2025-state-of-ai-assisted-software-development-report/)
- [CFO Dive — 72% ROI metrics for GenAI (Wharton)](https://www.cfodive.com/news/72percent-business-leaders-use-roi-metrics-for-genai-spend/804188/)
- [RGP — CFO AI Readiness 2026 (14% substantial ROI today)](https://rgp.com/wp-content/uploads/2025/12/FoundationalDivide_AI_Readiness_CFOResearch_2026_Report_RGP.pdf)
- [OptyxStack — Cost per successful AI task](https://optyxstack.com/cost-optimization/calculate-cost-per-successful-ai-task)
- [Olakai](https://olakai.ai/) · [Pay-i](https://pay-i.com/) · [Roiva](https://roiva.ai/) · [LensAI](https://getlens.ai/) — ROI / agent economics category

---

*Outcome Ledger is independent of Authon and Agent Money. Inspired by the Uber COO narrative and the 2026 enterprise AI accountability cycle.*
