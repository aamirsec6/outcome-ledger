/** Demo data until Outcome Ledger API is wired. */

export type TeamRow = {
  teamId: string;
  teamName: string;
  spendUsd: number;
  acceptedOutcomes: number;
  cpstUsd: number;
  failureCostShare: number;
  attributedPct: number;
};

export type Overview = {
  dataSource?: string;
  periodLabel: string;
  metricVersion?: string;
  stableDays?: number;
  totalSpendUsd: number;
  totalOutcomes: number;
  stableOutcomes?: number;
  pendingOutcomes?: number;
  revertedOutcomes?: number;
  orgCpstUsd: number;
  attributedSpendPct: number;
  failureCostShare: number;
  spendTrend: { week: string; spend: number; outcomes: number }[];
  teams: TeamRow[];
  integrations: { id: string; name: string; status: "connected" | "csv" | "pending" }[];
  lastSync?: { trigger: string; ok: boolean; startedAt: string } | null;
  activeContract?: {
    version: string;
    cfoApproved?: boolean;
  } | null;
};

export function getMockOverview(): Overview {
  return {
    periodLabel: "Last 90 days (demo)",
    totalSpendUsd: 284_200,
    totalOutcomes: 412,
    orgCpstUsd: 690,
    attributedSpendPct: 84,
    failureCostShare: 31,
    spendTrend: [
      { week: "W1", spend: 52, outcomes: 68 },
      { week: "W2", spend: 61, outcomes: 72 },
      { week: "W3", spend: 58, outcomes: 65 },
      { week: "W4", spend: 71, outcomes: 78 },
      { week: "W5", spend: 42, outcomes: 55 },
    ].map((r) => ({
      week: r.week,
      spend: r.spend * 1000,
      outcomes: r.outcomes,
    })),
    teams: [
      {
        teamId: "payments",
        teamName: "Payments",
        spendUsd: 92_400,
        acceptedOutcomes: 148,
        cpstUsd: 624,
        failureCostShare: 28,
        attributedPct: 91,
      },
      {
        teamId: "maps",
        teamName: "Maps & Routing",
        spendUsd: 78_100,
        acceptedOutcomes: 96,
        cpstUsd: 813,
        failureCostShare: 35,
        attributedPct: 82,
      },
      {
        teamId: "growth",
        teamName: "Growth",
        spendUsd: 61_200,
        acceptedOutcomes: 112,
        cpstUsd: 546,
        failureCostShare: 26,
        attributedPct: 88,
      },
      {
        teamId: "platform",
        teamName: "Platform",
        spendUsd: 52_500,
        acceptedOutcomes: 56,
        cpstUsd: 938,
        failureCostShare: 38,
        attributedPct: 76,
      },
    ],
    integrations: [
      { id: "openai", name: "OpenAI", status: "connected" },
      { id: "anthropic", name: "Anthropic", status: "connected" },
      { id: "github", name: "GitHub", status: "connected" },
      { id: "cursor", name: "Cursor", status: "csv" },
      { id: "claude-code", name: "Claude Code", status: "csv" },
      { id: "langfuse", name: "Langfuse", status: "pending" },
    ],
  };
}
