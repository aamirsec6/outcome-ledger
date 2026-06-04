import type { Overview } from "@/lib/mock-metrics";

/** Empty workspace — never show demo dollars for a real tenant. */
export function emptyOverview(): Overview {
  return {
    periodLabel: "Last 90 days",
    metricVersion: "1.0",
    totalSpendUsd: 0,
    totalOutcomes: 0,
    stableOutcomes: 0,
    orgCpstUsd: 0,
    attributedSpendPct: 0,
    failureCostShare: 0,
    spendTrend: [],
    teams: [],
    integrations: [],
    lastSync: null,
    activeContract: null,
    dataSource: "empty",
  };
}
