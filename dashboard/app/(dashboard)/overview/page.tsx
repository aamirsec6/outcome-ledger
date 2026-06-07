import { AiAdoptionPanel } from "@/components/ai-adoption-panel";
import { AttributionBanner } from "@/components/attribution-banner";
import { AttributionOverridePanel } from "@/components/attribution-override-panel";
import { BenchmarkPanel } from "@/components/benchmark-panel";
import { CpstChart } from "@/components/cpst-chart";
import { MetricCard } from "@/components/metric-card";
import { OutcomeGraphPanel } from "@/components/outcome-graph-panel";
import { OverviewTabs } from "@/components/overview-tabs";
import { SetupRequired } from "@/components/setup-required";
import { WinsPanel } from "@/components/wins-panel";
import {
  fetchAiAdoption,
  fetchAttribution,
  fetchBenchmarks,
  fetchOverview,
  fetchWins,
} from "@/lib/api";
import {
  attributionInsight,
  cpstTrendInsight,
} from "@/lib/chart-insights";
import { METRICS } from "@/lib/copy";
import { pct, usd, usdCpst } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, winsData, attribution, benchmarks, aiAdoption] = await Promise.all([
    fetchOverview(),
    fetchWins(),
    fetchAttribution(),
    fetchBenchmarks(),
    fetchAiAdoption(),
  ]);

  const needsSetup =
    data.dataSource === "setup-required" ||
    data.dataSource === "empty" ||
    (!data.lastSync && (data.totalSpendUsd ?? 0) === 0);

  if (needsSetup) {
    return <SetupRequired />;
  }

  const spendTrend = data.spendTrend ?? [];
  const teams = data.teams ?? [];
  const orgCpstUsd = data.orgCpstUsd ?? 0;
  const cpstInsight = cpstTrendInsight(spendTrend);
  const attrInsight = attributionInsight(data.attributedSpendPct ?? 0);

  const periodLine = [
    data.periodLabel,
    data.lastSync?.startedAt ? `Synced ${data.lastSync.startedAt}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <p className="text-xs theme-text-dim">{periodLine}</p>

      {(data.attributedSpendPct ?? 0) < 80 ? (
        <AttributionBanner attributedSpendPct={data.attributedSpendPct} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={METRICS.totalSpend}
          value={usd(data.totalSpendUsd)}
          hint={METRICS.totalSpendHint}
        />
        <MetricCard
          label={METRICS.completedWork}
          value={String(data.stableOutcomes ?? data.totalOutcomes)}
          hint={
            (data.pendingOutcomes ?? 0) > 0
              ? `${data.pendingOutcomes} waiting to count`
              : METRICS.completedWorkHint
          }
          urgency="neutral"
        />
        <MetricCard
          label={METRICS.costPerWin}
          value={usdCpst(data.orgCpstUsd)}
          hint={cpstInsight.detail}
          urgency={cpstInsight.urgency}
        />
        <MetricCard
          label={METRICS.spendTagged}
          value={pct(data.attributedSpendPct)}
          hint={METRICS.spendTaggedHint}
          urgency={attrInsight.urgency}
        />
      </div>

      <OverviewTabs
        summary={
          <>
            <section className="theme-panel rounded-xl p-5">
              <h2 className="text-sm font-medium theme-heading">
                Cost per win over time
              </h2>
              <p className="mb-4 text-xs theme-text-muted">
                Weekly — lower is better
              </p>
              <CpstChart data={spendTrend} />
            </section>
            <BenchmarkPanel report={benchmarks} />
          </>
        }
        output={
          <>
            <WinsPanel
              winDefinition={
                winsData.winDefinition ||
                (data as { winDefinition?: string }).winDefinition ||
                "Merged pull requests that count as accepted engineering wins."
              }
              wins={winsData.wins}
              limit={8}
              totalCount={
                (winsData as { total?: number }).total ?? winsData.wins.length
              }
              compact
            />
            {teams.length > 0 ? (
              <section className="theme-panel rounded-xl p-5">
                <h2 className="mb-4 text-sm font-medium theme-heading">Teams</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase theme-text-dim" style={{ borderColor: "var(--border)" }}>
                        <th className="pb-2 pr-4">Team</th>
                        <th className="pb-2 pr-4">Spend</th>
                        <th className="pb-2 pr-4">Wins</th>
                        <th className="pb-2 pr-4">Cost / win</th>
                        <th className="pb-2">Tagged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((t) => (
                        <tr
                          key={t.teamId}
                          className="border-b theme-text-muted"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td className="py-3 pr-4 font-medium theme-heading">
                            {t.teamName}
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{usd(t.spendUsd)}</td>
                          <td className="py-3 pr-4 tabular-nums">
                            {t.acceptedOutcomes}
                          </td>
                          <td
                            className={`py-3 pr-4 tabular-nums ${
                              t.cpstUsd > orgCpstUsd * 1.15
                                ? "theme-bad"
                                : t.cpstUsd < orgCpstUsd * 0.85
                                  ? "theme-good"
                                  : "theme-accent"
                            }`}
                          >
                            {usd(t.cpstUsd)}
                          </td>
                          <td className="py-3 tabular-nums">{pct(t.attributedPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        }
        ai={<AiAdoptionPanel report={aiAdoption} />}
        attribution={
          <>
            {attribution?.outcomeGraph ? (
              <OutcomeGraphPanel graph={attribution.outcomeGraph} />
            ) : null}
            <AttributionOverridePanel />
            {attribution &&
            !attribution.meetsTarget &&
            attribution.unassignedBySource.length > 0 ? (
              <section className="theme-panel rounded-xl p-4 text-sm theme-text-muted">
                <p className="font-medium theme-heading">Untagged spend by source</p>
                <ul className="mt-2 space-y-1">
                  {attribution.unassignedBySource.map((row) => (
                    <li key={row.source} className="flex justify-between tabular-nums">
                      <span>{row.source}</span>
                      <span className="theme-bad">{usd(row.spendUsd)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        }
      />

      {data.dataSource === "mock" || data.dataSource === "mock-fallback" ? (
        <p className="text-center text-xs theme-text-dim">Demo data</p>
      ) : null}
    </div>
  );
}
