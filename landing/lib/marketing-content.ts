export const HERO_STATS = [
  { label: "CPST v1.0", value: "Metric standard" },
  { label: "7-day", value: "Stability gate" },
  { label: "3+", value: "Vendor ingest" },
  { label: "<5 min", value: "Board export" },
  { label: "100%", value: "Deterministic math" },
  { label: "CFO", value: "Sign-off ready" },
] as const;

export const PRODUCT_LAYERS = [
  {
    id: "ingest",
    status: "LIVE" as const,
    title: "Vendor ingest",
    description:
      "Pull fully loaded spend from OpenAI, Anthropic, Cursor, and CSV — no custom agent instrumentation.",
    bullets: ["Org usage APIs", "Billing exports", "Deduped events", "Audit raw refs"],
  },
  {
    id: "outcomes",
    status: "LIVE" as const,
    title: "Accepted outcomes",
    description:
      "Define what counts as a win: stable merged PR, default-branch commit, with revert scan.",
    bullets: ["7-day stability", "Revert detection", "Win panel per PR", "Versioned defs"],
  },
  {
    id: "attribution",
    status: "LIVE" as const,
    title: "Attribution engine",
    description:
      "Map spend to teams and repos. Coverage % visible — CFO exports footnote the unknown bucket.",
    bullets: ["Team mappings", "Repo ownership", "Confidence scores", "≥80% target"],
  },
  {
    id: "cpst",
    status: "LIVE" as const,
    title: "CPST engine",
    description:
      "Cost per successful outcome — numerator includes failures; denominator only accepted wins.",
    bullets: ["Org + team CPST", "Failure cost share", "Monthly snapshots", "Trend history"],
  },
  {
    id: "contracts",
    status: "LIVE" as const,
    title: "Outcome contracts",
    description:
      "Versioned methodology your CFO signs. Board metrics stay comparable when definitions change.",
    bullets: ["Draft → publish", "CFO attestation", "Audit trail", "PDF appendix"],
  },
  {
    id: "reports",
    status: "LIVE" as const,
    title: "Executive reports",
    description:
      "LLM narrative from metrics JSON only — never hallucinated CPST. Human approves before PDF.",
    bullets: ["CSV export", "Board PDF", "HITL approve", "Methodology version"],
  },
] as const;

export const USE_CASES = [
  {
    n: "01",
    title: "CTO / VP Engineering",
    headline: "Renew the AI coding budget with proof",
    description:
      "Finance asks for ROI; token charts don't answer it. Show CPST by team and what actually shipped.",
    bullets: ["Stable merged outcomes", "Team comparison", "Sync audit log"],
  },
  {
    n: "02",
    title: "CFO / FP&A",
    headline: "One defensible number for the board",
    description:
      "Signed outcome contract + deterministic CPST. Every dollar traces to vendor + formula version.",
    bullets: ["CFO sign-off", "PDF methodology", "Immutable snapshots"],
  },
  {
    n: "03",
    title: "Platform / AI FinOps",
    headline: "Who burns cash without shipping?",
    description:
      "Attribution breakdown by source. Raise coverage from team mappings and vendor keys.",
    bullets: ["Unassigned spend", "Vendor status", "Daily cron sync"],
  },
  {
    n: "04",
    title: "Engineering Director",
    headline: "Fair squad comparison",
    description:
      "Cost per merged PR that stuck — not lines of code or adoption %. Failure cost share included.",
    bullets: ["Wins panel", "Revert share", "Workflow-ready"],
  },
] as const;

export const PERF_METRICS = [
  { value: "6", label: "Product layers", hint: "Ingest → board export" },
  { value: "CPST", label: "Unit of account", hint: "Not tokens or hours saved" },
  { value: "7d", label: "Stability window", hint: "Configurable per org" },
  { value: "1", label: "Hero metric", hint: "Fully loaded spend ÷ wins" },
] as const;

export const FAQ_ITEMS = [
  {
    q: "How is Outcome Ledger different from Langfuse or Helicone?",
    a: "Observability tools count tokens and traces. Outcome Ledger is value accounting: fully loaded AI spend divided by accepted engineering outcomes (CPST), with CFO-signable definitions.",
  },
  {
    q: "Does the LLM calculate CPST?",
    a: "Never. All numbers are deterministic SQL aggregates. The LLM only writes executive prose from precomputed metrics JSON — human approves before PDF export.",
  },
  {
    q: "What counts as an accepted outcome?",
    a: "Default: PR merged to default branch, not reverted within 7 days. Or direct commits on master/main. Versioned in your outcome contract.",
  },
  {
    q: "Is this related to Authon or Agent Money?",
    a: "No. Outcome Ledger is a standalone product — value accounting for AI-assisted engineering, not agent governance or wallets.",
  },
  {
    q: "How do I get access?",
    a: "Join the design partner waitlist. We onboard teams with the sharpest ROI pain first — connect vendors + GitHub in under a day.",
  },
] as const;
