/** Plain-language UI copy — no jargon in user-facing strings. */

export const PRODUCT_TAGLINE = "AI spend & shipped work";

export const NAV = {
  overview: "Overview",
  teams: "Teams",
  integrations: "Connect",
  reports: "Reports",
  winDefinition: "Win rules",
  settings: "Settings",
} as const;

export const TEAMS = {
  pageSubtitle: "Compare AI spend and shipped wins by squad",
  spendConfidence: "Spend confidence",
  spendConfidenceHint: "How sure we are spend belongs to this team",
  aiSpend: "AI spend",
  winsShipped: "Wins shipped",
} as const;

export const METRICS = {
  totalSpend: "Total AI spend",
  totalSpendHint: "OpenAI, Anthropic, Cursor, and Claude Code",
  completedWork: "Completed work",
  completedWorkHint: "Shipped changes that count as a win",
  costPerWin: "Cost per win",
  spendTagged: "Spend tagged to teams",
  spendTaggedHint: "Share of spend we can tie to a team",
} as const;
