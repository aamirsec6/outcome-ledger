#!/usr/bin/env python3
"""Generate Outcome Ledger problem + feasibility validation PDF."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Outcome-Ledger-Problem-Feasibility.pdf"


def _safe(text: str) -> str:
    text = (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2265", ">=")
        .replace("\u2264", "<=")
        .replace("\u00d7", "x")
        .replace("\u2192", "->")
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
            self.cell(0, 8, _safe(f"Outcome Ledger  |  Page {self.page_no()}"), align="C")

    pdf = Doc()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)

    def content_w() -> float:
        return pdf.w - pdf.l_margin - pdf.r_margin

    def title_page():
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 22)
        pdf.cell(0, 12, "Outcome Ledger", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 14)
        pdf.set_text_color(40, 40, 40)
        pdf.multi_cell(
            content_w(),
            8,
            _safe(
                "Problem Validation & Feasibility Brief\n"
                "Value accounting for AI-assisted engineering"
            ),
        )
        pdf.ln(6)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(
            0,
            6,
            _safe(f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d')} (UTC)"),
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.cell(0, 6, "Standalone product - CPST / outcome contracts / board exports", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        pdf.set_draw_color(52, 211, 153)
        pdf.set_line_width(0.8)
        pdf.line(18, pdf.get_y(), 120, pdf.get_y())
        pdf.ln(8)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "Purpose of this document", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            content_w(),
            5.5,
            _safe(
                "Validate whether the problem is real and urgent, whether Outcome Ledger's "
                "approach (cost per accepted outcome) is feasible to build and sell, and how "
                "the current MVP proves the thesis with deterministic metrics - not adoption theater."
            ),
        )

    def h1(text: str):
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 8, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def h2(text: str):
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def body(text: str):
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(content_w(), 5.5, _safe(text))

    def bullet(items: list[str]):
        pdf.set_font("Helvetica", "", 10)
        for item in items:
            pdf.multi_cell(content_w(), 5.5, _safe(f"  - {item}"))

    def table(headers: list[str], rows: list[list[str]], col_widths: list[int] | None = None):
        if not col_widths:
            w = (pdf.w - pdf.l_margin - pdf.r_margin) / len(headers)
            col_widths = [int(w)] * len(headers)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(240, 240, 240)
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 7, _safe(h), border=1, fill=True)
        pdf.ln()
        pdf.set_font("Helvetica", "", 9)
        for row in rows:
            for i, cell in enumerate(row):
                pdf.cell(col_widths[i], 6, _safe(str(cell)[:42]), border=1)
            pdf.ln()

    def formula(text: str):
        pdf.set_font("Courier", "", 9)
        pdf.set_fill_color(248, 248, 248)
        pdf.multi_cell(content_w(), 5, _safe(text), fill=True)
        pdf.set_font("Helvetica", "", 10)

    # --- Content ---
    title_page()

    pdf.add_page()
    h1("1. Executive summary")
    body(
        "Enterprises are spending aggressively on AI coding tools (OpenAI, Anthropic, Cursor, "
        "Claude Code) but leadership cannot tie that spend to customer-visible outcomes. "
        "Outcome Ledger is the value accounting layer: it ingests fully loaded AI spend, "
        "defines accepted wins via versioned outcome contracts, and reports CPST (cost per "
        "stable outcome) - the unit economics finance and engineering can share."
    )
    body(
        "Feasibility today: MVP is shipped - GitHub outcomes, vendor ingest, team attribution, "
        "outcome-linked spend graph, executive reports, PDF/CSV export, and production deploy "
        "on Railway. The remaining gap is customer data volume (real vendor $) and CFO-signed "
        "contracts - not core metric plumbing."
    )

    h1("2. Problem validation")
    h2("2.1 The buyer quote (Uber COO narrative)")
    body(
        'Andrew Macdonald (Uber COO): "That link is not there yet" - between AI adoption stats '
        "and producing more useful consumer features. Finance will compare token cost vs "
        "headcount without a line to useful features - and that trade becomes harder to justify."
    )
    h2("2.2 What teams measure vs what leadership asks")
    table(
        ["Layer", "Tracked today", "Leadership asks"],
        [
            ["Inputs", "Tokens, licenses, % on Copilot", "-"],
            ["Activity", "PRs, LOC, agent runs", "-"],
            ["Outcomes", "Fragmented", "Ship velocity for users, defects, NPS"],
            ["Unit economics", "Rare", "Cost per successful outcome by team"],
        ],
        [45, 55, 80],
    )
    h2("2.3 Failure modes (why status quo fails)")
    bullet(
        [
            "10x code != 10x value - review debt, wrong features, instability (DORA 2025).",
            "Agentic loops >> chat economics - budgets blow before attribution exists.",
            "ROI theater - most execs claim ROI metrics; <1% report >=20% ROI on GenAI.",
            "Tool sprawl - no single customer value receipt across vendors.",
        ]
    )

    h1("3. Product thesis")
    body(
        "Stop reporting AI adoption. Report what became better for the customer - and the "
        "fully loaded cost per win."
    )
    formula(
        "Workflow -> Work unit (PR, deploy, ticket)\n"
        "  -> AI cost (tools, retries, failures)\n"
        "    -> Outcome signal (merged, not reverted, deployed)\n"
        "      -> CPST = fully_loaded_spend / count(accepted_outcomes)"
    )
    body(
        "Hero metric: CPST (Cost Per Stable/Successful Task). Numerator includes failed runs "
        "and retries; denominator only accepted outcomes under a signed contract definition."
    )

    pdf.add_page()
    h1("4. How Outcome Ledger does costing")
    h2("4.1 Total AI spend (numerator)")
    body(
        "Sum of usage_events.cost_usd in the lookback window (default 90 days). Sources: "
        "OpenAI usage API, Anthropic admin API, Cursor/Claude Code CSV, manual CSV upload. "
        "This is fully loaded spend - not successful-call-only."
    )
    h2("4.2 Accepted outcomes (denominator)")
    body(
        "Counted from outcome_events matching the active outcome contract: e.g. merged PR to "
        "default branch, not reverted within stability window (OUTCOME_STABLE_DAYS). Alternative "
        "win type: default-branch commits. Only contract-defined outcome types count toward CPST."
    )
    formula("Org CPST (USD) = Total AI spend / Stable accepted outcomes")
    body(
        "Example: $201,400 spend / 209 stable PRs = $964 per outcome. Early pilots with sparse "
        "vendor data may show small totals ($24 / 209 PRs = $0.11/PR) - structure is valid; "
        "magnitude becomes meaningful once real vendor ingest runs."
    )
    h2("4.3 Team attribution (board-ready)")
    formula("Attributed spend % = Spend with team_id (not unassigned) / Total spend")
    body("Target >= 80%. Enables squad-level CPST and board-ready exports.")
    h2("4.4 Outcome-linked spend (attribution graph)")
    body(
        "For each accepted outcome, sum usage in a time window: 14 days before merge, 2 days "
        "after, preferring same GitHub repo. Produces linked %, unlinked $, avg confidence. "
        "CSV rows without repo can still link in the time window (org-wide fallback)."
    )
    h2("4.5 Weekly CPST trend")
    body(
        "Five rolling 7-day buckets: week CPST = week spend / week stable outcomes. Green when "
        "CPST falls week-over-week (cheaper per win). Operational signal for platform leaders."
    )
    h2("4.6 Failure cost share")
    body(
        "Share of spend not attributable to stable outcomes or tagged as failure/retry paths - "
        "surfaces waste before finance asks."
    )

    h1("5. Why this is valuable (not a token dashboard)")
    table(
        ["Token / usage dashboard", "Outcome Ledger"],
        [
            ["We spent $X on OpenAI", "We spent $X per merged PR that stuck"],
            ["Adoption, seats, calls", "Contract-defined accepted outcomes"],
            ["Easy to game with volume", "Denominator = real delivery"],
            ["Finance skeptical", "Versioned formula + PDF + CFO sign-off"],
        ],
        [85, 95],
    )

    pdf.add_page()
    h1("6. Feasibility - what is built (MVP)")
    table(
        ["Capability", "Status", "Notes"],
        [
            ["OpenAI / Anthropic ingest", "Shipped", "Usage APIs"],
            ["CSV usage upload", "Shipped", "Cursor, Claude Code"],
            ["GitHub outcomes", "Shipped", "PR merge, revert check"],
            ["Outcome contracts v1", "Shipped", "CFO sign-off flow"],
            ["CPST + team metrics", "Shipped", "Deterministic"],
            ["Outcome-linked graph", "Shipped", "Phase 1 windows"],
            ["Executive report + PDF", "Shipped", "HITL approve"],
            ["Dashboard + landing", "Shipped", "Railway production"],
            ["Multi-tenant SaaS", "Later", "Design partners"],
            ["Customer NPS link", "Later", "Phase 2"],
        ],
        [55, 22, 105],
    )

    h1("7. Feasibility scorecard")
    table(
        ["Dimension", "Score (1-5)", "Rationale"],
        [
            ["Pain intensity", "5", "Public C-suite; budget overruns"],
            ["Budget availability", "5", "AI line item growing"],
            ["Urgency (2026 proof year)", "5", "Investor + CFO pressure"],
            ["Competition", "3", "Fragmented; no eng->customer winner"],
            ["Willingness to pay", "4", "Observability + ROI SaaS comps"],
            ["Ability to deliver MVP", "4", "Core shipped; data onboarding"],
            ["Overall opportunity", "Strong", "Standalone category"],
        ],
        [50, 25, 110],
    )

    h1("8. Moat over time (why it compounds)")
    bullet(
        [
            "Accepted-outcome ontology - CFO-signed definition; switching rebaselines board metrics.",
            "Attribution graph - spend -> repo -> outcome history compounds monthly.",
            "CPST as internal standard - unit of account for AI engineering ROI.",
            "Benchmark network (future) - anonymized vertical CPST percentiles.",
        ]
    )

    h1("9. Pilot checklist (prove value in 8 weeks)")
    bullet(
        [
            "Connect OpenAI + Anthropic (or upload 90-day CSVs).",
            "Install GitHub App; run Sync.",
            "Map teams to repos (Settings) - target 80%+ attributed spend.",
            "Publish outcome contract; obtain CFO sign-off on win definition.",
            "Review Overview: Org CPST, weekly trend, outcome-linked %.",
            "Generate executive report; export board PDF.",
            "Decision: renew coding-AI budget with CPST trend as evidence.",
        ]
    )

    pdf.add_page()
    h1("10. Risks & honest limits")
    table(
        ["Risk", "Mitigation"],
        [
            ["Outcomes company-specific", "Templates + versioned contracts"],
            ["Correlation != causation", "Paired metrics; honest language"],
            ["Sparse early data", "Diagnostic ingests; CSV fallback"],
            ["Competitors (Olakai, etc.)", "Deeper CI/outcome chain"],
            ["Privacy", "No prompt storage; aggregate $ + IDs"],
        ],
        [55, 130],
    )

    h1("11. Recommended next steps")
    bullet(
        [
            "5 CTO/CFO interviews using Macdonald quote as opener.",
            "Run 90-day ingest + first CPST-by-squad report for design partner.",
            "Align outcome contract with how the org defines a win (PR vs commit).",
            "Track CPST monthly; aim for downward trend or explain variance.",
            "Expand beyond eng wedge (support tickets, experiments) in Phase 2.",
        ]
    )

    h1("12. References & product docs")
    body(
        "In-repo: docs/value-one-pager.md, docs/prd.md, docs/moat.md, docs/railway-project.md. "
        "External: DORA 2025, Uber/Macdonald coverage (The Verge, Gizmodo), OptyxStack CPST methodology."
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
