#!/usr/bin/env python3
"""Generate Outcome Ledger: problem validation, shipped work, and pipeline PDF."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Outcome-Ledger-Validation-Brief.pdf"


def _safe(text: str) -> str:
    text = (
        text.replace("\u2014", " - ")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2265", ">=")
        .replace("\u2264", "<=")
        .replace("\u00d7", "x")
        .replace("\u2192", "->")
        .replace("\u00f7", "/")
    )
    return text.encode("latin-1", errors="replace").decode("latin-1")


def main() -> None:
    try:
        from fpdf import FPDF
    except ImportError:
        print("Install fpdf2: pip install fpdf2", file=sys.stderr)
        sys.exit(1)

    class Doc(FPDF):
        def footer(self):
            self.set_y(-12)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(120, 120, 120)
            self.cell(
                0,
                8,
                _safe(f"Outcome Ledger Validation Brief  |  Page {self.page_no()}"),
                align="C",
            )

    pdf = Doc()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(16, 16, 16)

    def cw() -> float:
        return pdf.w - pdf.l_margin - pdf.r_margin

    def title_page():
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 24)
        pdf.cell(0, 14, "Outcome Ledger", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(
            cw(),
            9,
            _safe(
                "Problem Validation, Product Status & Pipeline\n"
                "June 2026"
            ),
        )
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(
            0,
            6,
            _safe(f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC"),
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.ln(8)
        pdf.set_draw_color(52, 211, 153)
        pdf.set_line_width(0.9)
        pdf.line(16, pdf.get_y(), 130, pdf.get_y())
        pdf.ln(10)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "What this document is for", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            cw(),
            5.5,
            _safe(
                "Use this brief to validate whether the problem is real, whether Outcome Ledger "
                "solves it credibly, what has already been built, and what remains in the pipeline. "
                "Section 2 is designed for design-partner conversations and investor diligence. "
                "Section 5 lists concrete signals that prove or disprove the thesis."
            ),
        )

    def h1(text: str):
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 8, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def h2(text: str):
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def h3(text: str):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def body(text: str):
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(cw(), 5.2, _safe(text))

    def bullet(items: list[str]):
        pdf.set_font("Helvetica", "", 10)
        for item in items:
            pdf.multi_cell(cw(), 5.2, _safe(f"  * {item}"))

    def quote(text: str):
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(cw(), 5.2, _safe(f'"{text}"'))
        pdf.set_text_color(0, 0, 0)

    def formula(text: str):
        pdf.set_font("Courier", "", 9)
        pdf.set_fill_color(245, 245, 245)
        pdf.multi_cell(cw(), 5, _safe(text), fill=True)
        pdf.set_font("Helvetica", "", 10)

    def table(headers: list[str], rows: list[list[str]], widths: list[int] | None = None):
        if not widths:
            w = cw() / len(headers)
            widths = [int(w)] * len(headers)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(235, 235, 235)
        for i, h in enumerate(headers):
            pdf.cell(widths[i], 7, _safe(h), border=1, fill=True)
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        for row in rows:
            for i, cell in enumerate(row):
                pdf.cell(widths[i], 6, _safe(str(cell)[:50]), border=1)
            pdf.ln()

    # ---- BUILD PDF ----
    title_page()

    # PART A: PROBLEM VALIDATION
    pdf.add_page()
    h1("Part A. Problem validation")
    h2("A1. The core problem (one sentence)")
    body(
        "Enterprises are spending millions on AI coding tools but cannot tie that spend to "
        "customer-visible outcomes. Leadership has adoption charts; finance has token bills; "
        "neither answers: what got better for users, and what did each real win cost?"
    )

    h2("A2. Anchor evidence: Uber COO (May 2026)")
    body(
        "Andrew Macdonald (Uber President & COO) on the Rapid Response podcast and in press "
        "(The Verge, Quartz, TechSpot, May 2026):"
    )
    quote(
        "That link is not there yet. It is very hard to draw a line between AI adoption stats "
        "and producing 25 percent more useful consumer features."
    )
    quote(
        "If you are not able to draw a direct line to how many useful features you are shipping "
        "to your users, that trade becomes harder to justify."
    )
    bullet(
        [
            "Uber exhausted its 2026 Claude Code / AI budget in roughly 4 months.",
            "~95% of engineers use AI monthly; high token usage; per-engineer caps introduced.",
            "Finance compares token consumption and cost vs headcount without outcome proof.",
            "This is not anti-AI. It is a measurement gap, not a tooling gap.",
        ]
    )

    h2("A3. What organizations track vs what leadership asks")
    table(
        ["Layer", "Tracked today", "Leadership asks"],
        [
            ["Inputs", "Tokens, licenses, % on Copilot", "(not asked directly)"],
            ["Activity", "PRs, LOC, agent runs, commits", "(proxy metrics)"],
            ["Outcomes", "Fragmented across tools", "Ship velocity for users, defects, NPS"],
            ["Unit economics", "Rare", "Cost per successful outcome by team/workflow"],
        ],
        [38, 58, 90],
    )

    h2("A4. Why the status quo fails (four failure modes)")
    bullet(
        [
            "10x code is not 10x value: review debt, wrong features, instability (DORA 2025).",
            "Agentic economics: one prompt vs 500k-token loops; budgets blow before attribution.",
            "ROI theater: 72% of execs claim GenAI ROI metrics (Wharton); <1% report >=20% ROI.",
            "Tool sprawl: OpenAI + Anthropic + Cursor + agents with no single value receipt.",
        ]
    )

    h2("A5. Market demand signals (2025-2026)")
    table(
        ["Signal", "Source / implication"],
        [
            ["88% plan to increase GenAI spend", "Wharton: budget is committed"],
            ["61% more pressure to prove AI ROI", "Kyndryl 2025: urgency rising"],
            ["Only 14% CFOs see substantial ROI today", "RGP 2026: expectations gap"],
            ["CPST emerging as industry metric", "OptyxStack, Fireworks, FinOps blogs"],
            ["2026 = show me the money year", "Investor + board pressure on AI line items"],
        ],
        [75, 110],
    )

    h2("A6. Competitive white space")
    table(
        ["Category", "Examples", "Gap"],
        [
            ["LLM observability", "Langfuse, Helicone", "Cost per trace, not per accepted win"],
            ["AI FinOps", "StackSpend, Finout", "Budgets/chargeback, not customer outcomes"],
            ["ROI SaaS", "Olakai, Pay-i, Roiva", "Often surveys/hours saved, thin CI link"],
            ["Spend governance", "Agent wallets", "Authorization, not value proof"],
            ["Outcome Ledger", "(this product)", "Spend + GitHub win + signed definition"],
        ],
        [42, 48, 95],
    )

    h2("A7. Problem validation scorecard")
    table(
        ["Dimension", "Score 1-5", "Evidence"],
        [
            ["Pain intensity", "5", "Public C-suite quotes; budget overruns"],
            ["Budget availability", "5", "AI line item growing double digits"],
            ["Urgency", "5", "2026 proof year; investor pressure"],
            ["Problem is widespread", "4", "Uber is loudest; pattern fits large tech"],
            ["Willingness to pay", "4", "Observability + ROI SaaS comps exist"],
            ["Category clarity", "3", "Buyers do not search CPST yet; education cost"],
            ["Overall", "Strong", "Problem validated; product category forming"],
        ],
        [48, 22, 115],
    )

    pdf.add_page()
    h2("A8. Validation interview script (5 conversations)")
    body(
        "Goal: confirm the problem exists, learn what counts as a win, and test willingness "
        "to pay for a value layer. Do not pitch features first. Lead with the Uber quote."
    )
    h3("Opening (30 seconds)")
    quote(
        "Uber's COO said they cannot link AI coding spend to useful consumer features. "
        "Is that showing up for you too?"
    )
    h3("Discovery questions")
    bullet(
        [
            "What do you report to the board on AI engineering spend today?",
            "What would count as an accepted win for your org? (merged PR, deploy, ticket?)",
            "Who owns the AI tooling budget renewal? What proof do they need?",
            "What tools are connected today? (OpenAI, Anthropic, Cursor, GitHub)",
            "If you had cost per win by team next month, what decision would it change?",
            "What would make you NOT buy this? (best falsification question)",
        ]
    )
    h3("Signals that VALIDATE the problem")
    bullet(
        [
            "They already built a spreadsheet or hired a consultant for AI ROI.",
            "CFO or COO is in the conversation, not only platform eng.",
            "Budget caps or renewal friction on Cursor/Claude Code.",
            "They distrust token dashboards and % AI commits as board metrics.",
            "They can name a win definition within 5 minutes (even if imperfect).",
        ]
    )
    h3("Signals that INVALIDATE or narrow the wedge")
    bullet(
        [
            "They only care about inference cost per request (observability buyer).",
            "No GitHub or no accepted engineering outcome definition.",
            "AI spend under $50k/year with no board scrutiny.",
            "They want real-time spend blocking (gateway buyer, not value accounting).",
            "Happy with hours-saved surveys from vendor ROI reports.",
        ]
    )

    h2("A9. 8-week design partner proof plan")
    bullet(
        [
            "Week 1: Connect OpenAI + Anthropic + GitHub; run first Sync.",
            "Week 2: Map teams to repos; target >=80% attributed spend.",
            "Week 3: Publish outcome contract; CFO signs win definition.",
            "Week 4: First CPST by team report; review outcome-linked spend %.",
            "Week 5-6: Weekly CPST trend; identify highest-cost workflow type.",
            "Week 7: Executive report + board PDF export.",
            "Week 8: Decision meeting: renew AI budget with CPST as evidence.",
        ]
    )

    # PART B: PRODUCT THESIS
    pdf.add_page()
    h1("Part B. Product thesis and metric")
    h2("B1. What Outcome Ledger is")
    body(
        "Outcome Ledger is the value accounting layer between AI spend and real wins. "
        "It is standalone (not Authon, not Agent Money). It does not block spend. "
        "It produces a defensible cost per win number leadership can share."
    )
    formula(
        "Cost per win (CPST) = Fully loaded AI spend / Stable accepted outcomes\n\n"
        "Numerator: all vendor spend in period (includes retries, failures, untagged usage)\n"
        "Denominator: outcomes matching signed contract (e.g. merged PR, not reverted in 7d)"
    )
    h2("B2. Product stack (six layers)")
    table(
        ["Layer", "What it does"],
        [
            ["1. Vendor ingest", "OpenAI, Anthropic, CSV, Langfuse traces"],
            ["2. Accepted outcomes", "GitHub PRs/commits, revert scan, stability gate"],
            ["3. Attribution graph", "Links spend to outcomes with confidence scores"],
            ["4. CPST engine", "Org, team, workflow CPST + monthly snapshots"],
            ["5. Outcome contracts", "Versioned win definition + CFO sign-off"],
            ["6. Executive reports", "PDF/CSV board pack; LLM narrative from metrics only"],
        ],
        [45, 140],
    )

    h2("B3. Production URLs (June 2026)")
    bullet(
        [
            "API: outcome-ledger-production.up.railway.app",
            "Dashboard: outcome-ledger-dashboard-production.up.railway.app",
            "Landing: outcome-ledger-landing-production.up.railway.app",
        ]
    )

    # PART C: SHIPPED
    pdf.add_page()
    h1("Part C. What is built (shipped in detail)")
    h2("C1. Core platform (MVP)")
    table(
        ["Area", "Capability", "Status"],
        [
            ["Ingest", "OpenAI usage API", "Shipped"],
            ["Ingest", "Anthropic admin cost API", "Shipped"],
            ["Ingest", "CSV upload (Cursor, Claude Code)", "Shipped"],
            ["Ingest", "GitHub merged PRs + revert check", "Shipped"],
            ["Ingest", "GitHub default-branch commits (alt win)", "Shipped"],
            ["Ingest", "Langfuse public API traces", "Shipped (Phase 2)"],
            ["Auth", "Clerk multi-tenant + API keys", "Shipped"],
            ["Auth", "MCP private agent ingest", "Shipped"],
            ["Metrics", "Overview, teams, CPST history", "Shipped"],
            ["Metrics", "Wins panel per PR", "Shipped"],
            ["Contracts", "Outcome contracts draft/publish/CFO sign", "Shipped"],
            ["Reports", "CSV export, PDF board pack", "Shipped"],
            ["Reports", "Executive report + human approve", "Shipped"],
            ["Ops", "Sync pipeline + audit log + daily cron", "Shipped"],
            ["Ops", "Railway monorepo deploy (api/dashboard/landing)", "Shipped"],
        ],
        [32, 78, 75],
    )

    h2("C2. Intelligence Phase 1 (v0.3)")
    bullet(
        [
            "attribution_links table: persisted usage <-> outcome graph",
            "Proportional allocation: inverse-time weights + orphan CSV linking",
            "Manual overrides API: POST /v1/attribution/overrides",
            "Workflow classifier: rules on PR title, labels, paths (bugfix/feature/infra)",
            "Benchmark report: CPST vs prior month, workflow CPST breakdown",
            "Dashboard BenchmarkPanel on Overview",
            "Sync rebuilds graph after every ingest",
        ]
    )

    h2("C3. Intelligence Phase 2 (v0.4)")
    bullet(
        [
            "Learned linker: logistic regression on overrides + high-confidence links",
            "Usage time index: bisect for fast window queries at scale",
            "EWMA anomaly detection on weekly CPST spikes/drops",
            "Network benchmarks: k-anonymized vertical percentiles (cohort >=3 orgs)",
            "Attribution graph v3: ML-weighted allocation when linker trained",
            "Override review UI: low-confidence link confirmation on dashboard",
            "GET /v1/attribution/candidates for review queue",
        ]
    )

    h2("C4. Dashboard and landing (latest)")
    bullet(
        [
            "Overview: CPST chart, teams table, benchmark intelligence, outcome graph",
            "Integrations: GitHub OAuth, vendor keys, sync button",
            "Settings: org profile, team mappings, win definition, API keys",
            "Landing redesign: plain-language hero, full-width layout, value layer diagram",
            "Landing: cost per win messaging for general audience (not dev jargon)",
            "Waitlist with cohort cap for design partners",
        ]
    )

    h2("C5. Key API endpoints")
    table(
        ["Endpoint", "Purpose"],
        [
            ["POST /v1/sync", "Full ingest + graph rebuild + snapshots"],
            ["GET /v1/metrics/overview", "Org CPST, spend trend, teams"],
            ["GET /v1/metrics/benchmarks", "Deltas, anomalies, network percentiles"],
            ["GET /v1/metrics/attribution", "Linked spend %, sample links"],
            ["POST /v1/attribution/rebuild", "Rebuild attribution graph"],
            ["GET /v1/attribution/candidates", "Low-confidence links for review"],
            ["GET /v1/reports/export.pdf", "Board-ready PDF"],
            ["POST /v1/reports/executive", "Generate exec narrative"],
        ],
        [75, 110],
    )

    h2("C6. What is NOT yet proven (honest gaps)")
    bullet(
        [
            "No paying design partner logos with published CPST outcomes yet.",
            "Network benchmarks need >=3 anonymized orgs in same vertical.",
            "Learned linker needs more override training data per org.",
            "Real vendor $ at scale depends on customer connecting production keys.",
            "Problem validated in press/analyst data; not yet in 5+ customer interviews.",
        ]
    )

    # PART D: PIPELINE
    pdf.add_page()
    h1("Part D. Pipeline (what comes next)")
    h2("D1. Intelligence Phase 3")
    bullet(
        [
            "Linear/Jira linker: ticket <-> PR <-> trace graph",
            "XGBoost linker when training samples exceed 500 pairs",
            "LLM anomaly explainer: natural language CPST spike narratives",
            "Federated benchmarks: opt-in cross-org cohorts with differential privacy",
        ]
    )

    h2("D2. Enterprise roadmap (from docs)")
    h3("Phase B - Enterprise connect (next)")
    bullet(
        [
            "Platform-hosted GitHub OAuth for all customers",
            "GitHub App + webhooks for real-time merge events",
            "SSO (WorkOS/Auth0) + RBAC",
            "Encrypted credentials (KMS)",
            "Connect wizard with coverage % targets",
        ]
    )
    h3("Phase D - Enterprise scale")
    bullet(
        [
            "Multi-tenant org provisioning at scale",
            "GitHub Enterprise + Copilot metrics",
            "Amplitude / product analytics outcome webhooks",
            "Customer NPS and revenue outcome types",
        ]
    )

    h2("D3. PRD Phase 2-3 (product roadmap)")
    bullet(
        [
            "Phase 2: Langfuse OTel (partially shipped), workflow LLM classifier, Linear/Jira",
            "Phase 2: Amplitude outcome webhook, anomaly explainer",
            "Phase 3: Optional real-time gateway module",
            "Phase 3: Customer metric outcomes (NPS, revenue)",
            "Phase 3: Multi-org anonymized benchmarks (partially shipped in Phase 2)",
        ]
    )

    h2("D4. Go-to-market pipeline")
    bullet(
        [
            "Phase 1 GTM: 3-5 design partners (Uber-shaped: large eng, coding agents, ROI pressure)",
            "Offer: free 8-week diagnostic, 90-day ingest, first CPST-by-squad report",
            "Phase 2 SKU: Starter (GitHub + 1 vendor), Growth (+ Langfuse, Linear), Enterprise",
            "Messaging: You have the adoption chart; we give cost per feature customers received",
        ]
    )

    h2("D5. Recommended validation next steps (priority order)")
    bullet(
        [
            "1. Run 5 CTO/CFO/COO interviews using script in Section A8.",
            "2. Land 1 design partner with real OpenAI + Anthropic + GitHub data.",
            "3. Produce first customer-specific CPST-by-team PDF they present internally.",
            "4. Document before/after: what decision changed after seeing cost per win.",
            "5. Collect 3 anonymized benchmark contributions for network percentiles.",
            "6. Publish case study (even anonymized) once one partner renews AI budget with proof.",
        ]
    )

    pdf.add_page()
    h1("Part E. How to use this for problem validation")
    h2("E1. Hypothesis to test")
    body(
        "Hypothesis: Engineering leaders with >$500k/year AI coding spend cannot defend "
        "that spend to finance without a cost-per-accepted-outcome metric tied to GitHub wins."
    )
    h2("E2. Minimum evidence to call problem validated")
    bullet(
        [
            "3+ interviews where buyer describes same gap unprompted (after Uber quote).",
            "1 design partner connects data and uses CPST in an internal meeting.",
            "1 renewal or budget decision where CPST is cited as input.",
            "Buyer rejects token dashboard as sufficient (confirms category wedge).",
        ]
    )
    h2("E3. Minimum evidence to call solution validated")
    bullet(
        [
            "Attributed spend >=80% for a real customer org.",
            "Outcome-linked spend % trending up after sync + team mappings.",
            "CFO or finance lead signs outcome contract version.",
            "Executive PDF exported and shared without major manual edits to numbers.",
        ]
    )
    h2("E4. Risks to disclose in validation conversations")
    table(
        ["Risk", "Honest answer"],
        [
            ["Correlation not causation", "We report paired metrics; we do not claim AI caused the win"],
            ["Win definition varies", "Versioned contracts; customer defines acceptance"],
            ["Early data sparse", "Structure works; magnitude needs real vendor ingest"],
            ["Competition", "Observability adjacent; we own outcome-linked unit economics"],
        ],
        [55, 130],
    )

    h1("Appendix. References")
    bullet(
        [
            "In-repo: docs/value-one-pager.md, docs/prd.md, docs/moat.md",
            "In-repo: docs/intelligence-roadmap.md, docs/enterprise-roadmap.md",
            "Uber/Macdonald: Rapid Response podcast, The Verge, Quartz (May 2026)",
            "Wharton GenAI ROI survey (CFO Dive, 2025)",
            "RGP CFO AI Readiness 2026 (14% substantial ROI today)",
            "DORA 2025 State of AI-assisted software development",
            "OptyxStack: Cost per successful AI task methodology",
            "Production: github.com/aamirsec6/outcome-ledger",
        ]
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    kb = OUT.stat().st_size // 1024
    print(f"Wrote {OUT} ({kb} KB)")


if __name__ == "__main__":
    main()
