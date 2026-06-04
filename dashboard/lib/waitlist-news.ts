export type NewsItem = {
  id: string;
  headline: string;
  detail: string;
  source: string;
  tag: "budget" | "roi" | "research" | "leadership";
  volatile?: boolean;
};

/** Curated headlines — volatility + urgency for landing (sources in value-one-pager). */
export const WAITLIST_NEWS: NewsItem[] = [
  {
    id: "uber-coo",
    headline: "Uber COO: AI adoption is up — link to customer outcomes isn't there yet",
    detail:
      "Senior eng leaders can't yet tie token spend to 25% more useful consumer features. Finance will compare AI cost vs headcount without outcome proof.",
    source: "Masters of Scale / industry narrative, 2026",
    tag: "leadership",
    volatile: true,
  },
  {
    id: "budget-burn",
    headline: "Teams burning full-year Claude/Cursor budgets in ~4 months",
    detail:
      "Per-engineer caps are spreading before attribution exists — boards want one defensible ROI number, not another token chart.",
    source: "Enterprise eng reports, 2026",
    tag: "budget",
    volatile: true,
  },
  {
    id: "roi-theater",
    headline: "72% of execs claim GenAI ROI metrics — under 1% report ≥20% ROI",
    detail:
      "Most report 1–5% gains on productivity proxies, not customer impact. FP&A is skeptical of adoption dashboards.",
    source: "Wharton / Forbes surveys, 2025–2026",
    tag: "roi",
    volatile: true,
  },
  {
    id: "dora-stability",
    headline: "DORA 2025: AI lifts throughput — stability still suffers for many teams",
    detail:
      "More code ≠ more value. Reverts and review debt inflate fully loaded cost per real win.",
    source: "DORA State of DevOps, 2025",
    tag: "research",
  },
  {
    id: "cpst-standard",
    headline: "FinOps converging on cost per successful task (CPST), not tokens",
    detail:
      "Numerator includes failed runs; denominator only accepted outcomes. That's the metric boards are starting to ask for.",
    source: "Industry FinOps, 2026",
    tag: "roi",
  },
];

export const SOLUTION_OPTIONS = [
  {
    id: "cpst",
    label: "CPST — cost per merged PR that actually stuck",
  },
  {
    id: "finance",
    label: "Prove AI coding ROI to finance / board",
  },
  {
    id: "attribution",
    label: "Attribute OpenAI + Anthropic + Cursor spend to teams",
  },
  {
    id: "contracts",
    label: "CFO-signable outcome definitions (what counts as a win)",
  },
  {
    id: "exports",
    label: "Board-ready PDF with methodology appendix",
  },
  {
    id: "failure",
    label: "See failure cost share (reverts, pending stability)",
  },
] as const;
