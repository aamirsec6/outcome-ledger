"use client";

import { ArrowRight, CheckCircle2, DollarSign, GitBranch, Shield, TrendingDown, Users } from "lucide-react";
import { PageContainer } from "@/components/marketing/page-container";

const VALUE_ROWS = [
  {
    icon: DollarSign,
    accent: "emerald" as const,
    title: "One number your CFO trusts",
    desc: "Cost per win = total AI spend ÷ accepted outcomes. Formula is public, auditable, and signed off by your finance lead. No black box.",
    metric: "$962",
    metricLabel: "Example cost per win",
  },
  {
    icon: GitBranch,
    accent: "cyan" as const,
    title: "Real wins, not hero numbers",
    desc: "A win = merged PR or commit that didn't get rolled back in 7 days. Failed runs and retries are counted in spend, not hidden.",
    metric: "209",
    metricLabel: "Stable outcomes last quarter",
  },
  {
    icon: Users,
    accent: "amber" as const,
    title: "Fair team comparison",
    desc: "Compare cost per win across squads — not adoption %, not lines of code. Works whether a team uses Cursor, Copilot, or Claude Code.",
    metric: "3×",
    metricLabel: "Best vs worst team spread",
  },
  {
    icon: TrendingDown,
    accent: "emerald" as const,
    title: "Trend over time",
    desc: "Monthly snapshots show CPST going up or down. Tie it to vendor spend changes. Know if that $50K/month Cursor plan is paying off.",
    metric: "-12%",
    metricLabel: "CPST improvement after 3 months",
  },
  {
    icon: Shield,
    accent: "cyan" as const,
    title: "Board-ready in 5 minutes",
    desc: "Export a PDF with methodology appendix, signed outcome contract, and team breakdown. No spreadsheet archaeology before board meetings.",
    metric: "<5 min",
    metricLabel: "Time to board deck",
  },
];

const ROI_SCENARIOS = [
  {
    label: "Defend a budget",
    before: "CFO wants to cut AI spend 30% ($180K/yr)",
    after: "You prove CPST improved 12% → budget renewed, $180K saved from cuts",
  },
  {
    label: "Kill waste",
    before: "Team A burns $15K/mo with 5 wins ($3K/win)",
    after: "Cap Team A, reallocate to Team B (45 wins at $18K total). Save $12K/mo.",
  },
  {
    label: "Stop hiring",
    before: "Plan to hire 4 senior engs ($480K/yr) to ship faster",
    after: "CPST shows AI is paying off → delay hires, save $480K/yr",
  },
];

export function ValueProofSection() {
  return (
    <section
      id="value"
      className="scroll-mt-24 border-t border-[var(--border)] py-20 md:py-28"
    >
      <PageContainer>
        {/* Header */}
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-500/90">
            What you actually get
          </p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            The proof your leadership needs.
            <span className="block text-[var(--text-muted)]">
              Not dashboards. Decisions.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--text-muted)] lg:text-lg">
            Every feature below maps to a real budget conversation. If it doesn't help you save,
            defend, or reallocate AI spend — we don't build it.
          </p>
        </div>

        {/* Value rows */}
        <div className="mt-16 space-y-6">
          {VALUE_ROWS.map((row, i) => (
            <article
              key={row.title}
              className="group grid gap-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:border-[var(--border-strong)] sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center lg:gap-10 lg:p-8"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    row.accent === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : row.accent === "cyan"
                        ? "bg-cyan-500/10 text-cyan-400"
                        : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <row.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-dim)]">
                    Value {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-xl font-medium text-white">{row.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{row.desc}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums text-white lg:text-3xl">{row.metric}</p>
                <p className="mt-1 text-[10px] text-[var(--text-dim)]">{row.metricLabel}</p>
              </div>
            </article>
          ))}
        </div>

        {/* ROI Scenarios */}
        <div className="mt-20">
          <h3 className="text-2xl font-medium text-white md:text-3xl">
            Three ways teams use cost per win
          </h3>
          <p className="mt-3 max-w-2xl text-[var(--text-muted)]">
            These are real scenarios from design partners. In each one, the number changed a decision.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {ROI_SCENARIOS.map((s) => (
              <article
                key={s.label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
              >
                <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-500/80">
                  {s.label}
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-red-400/70">Situation</p>
                    <p className="mt-1 text-sm text-zinc-400">{s.before}</p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 rotate-90 text-zinc-600" />
                  </div>
                  <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-emerald-400/70">With Outcome Ledger</p>
                    <p className="mt-1 text-sm text-zinc-300">{s.after}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Bottom proof bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-5 lg:gap-10">
          {[
            { label: "Deterministic math", desc: "No AI hallucinations in metrics" },
            { label: "CFO sign-off", desc: "Signed outcome contracts" },
            { label: "Audit trail", desc: "Every sync logged" },
            { label: "Board PDF", desc: "Export in under 5 min" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="font-medium text-white">{item.label}</span>
              <span className="hidden text-[var(--text-dim)] sm:inline">— {item.desc}</span>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
