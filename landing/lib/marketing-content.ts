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

/** Plain-language cards for the redesigned landing */
export const AUDIENCE_CARDS = [
  {
    role: "CEO / COO",
    question: "Are we getting more for customers, or just spending more on AI?",
    answer:
      "See whether rising AI bills translate into shipped fixes and features. One cost per win number instead of adoption hype.",
  },
  {
    role: "CFO / Finance",
    question: "Can I defend this line item to the board?",
    answer:
      "Every dollar traces to a vendor bill. Every win has a definition you sign off on. Export a PDF with the formula. No black box.",
  },
  {
    role: "Engineering leader",
    question: "Which teams ship efficiently with AI, and which burn budget?",
    answer:
      "Compare cost per win by squad. Includes failed runs and retries in the spend, not just the wins.",
  },
  {
    role: "Anyone on the team",
    question: "What is this, in one sentence?",
    answer:
      "A receipt for AI assisted work: how much you spent on AI tools, divided by real wins that stuck.",
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
    q: "What exactly is 'cost per win'?",
    a: "Total AI spend (including failed runs and retries) divided by the number of wins that actually stuck. A 'win' is typically a merged pull request that wasn't rolled back within 7 days. We also call this CPST — cost per successful task. Example: $201K spent, 209 stable wins = $962 per win.",
  },
  {
    q: "How is this different from a token dashboard like Langfuse?",
    a: "Token dashboards tell you how much AI you used. Outcome Ledger tells you what you got for it — real shipped work tied to real dollars. Langfuse shows traces and costs. We show cost per accepted outcome. They're complementary; we even pull data from Langfuse.",
  },
  {
    q: "What if my team doesn't use PRs? We commit directly to main.",
    a: "We support both workflows. You can define a win as a default-branch commit (no PR needed) or as a merged PR. The outcome contract lets you choose what counts for your org.",
  },
  {
    q: "Do engineers need to change how they work?",
    a: "No. We pull from your existing tools — OpenAI/Anthropic APIs, GitHub, Cursor exports. No IDE plugin, no proxy, no code changes. Engineers keep working exactly as before.",
  },
  {
    q: "How long does it take to set up?",
    a: "Most teams are live within a day. Connect your AI vendor keys (5 min), connect GitHub (5 min), define what counts as a win (5 min), and hit sync. First cost per win number appears immediately.",
  },
  {
    q: "Is the math trustworthy? How does the board know it's not made up?",
    a: "Every metric uses a fixed, published formula. The outcome contract (signed by your CFO) defines what counts as a win. Every sync is logged. Every number traces back to a vendor bill and a GitHub event. The PDF export includes the full methodology appendix.",
  },
  {
    q: "What tools does it connect to?",
    a: "OpenAI, Anthropic, Cursor billing exports, CSV uploads, GitHub (OAuth or GitHub App), and optionally Langfuse for trace metadata. More connectors are on the roadmap.",
  },
  {
    q: "How much does it cost?",
    a: "Free for teams under 50 engineers. Paid plans start at $5K/month for larger teams. Most customers see the tool pay for itself within the first month by identifying wasted AI spend or defending budget renewals.",
  },
  {
    q: "Can I try it before committing?",
    a: "Yes. Join the waitlist and we'll set you up with a free workspace. Connect your data, see your first cost per win number, and decide if it's useful. No credit card required.",
  },
] as const;
