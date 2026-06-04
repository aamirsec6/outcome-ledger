import { AttributionBanner } from "@/components/attribution-banner";
import { CpstChart } from "@/components/cpst-chart";
import { MetricCard } from "@/components/metric-card";
import { OutcomeGraphPanel } from "@/components/outcome-graph-panel";
import { PageHeader } from "@/components/page-header";
import { WinsPanel } from "@/components/wins-panel";
import { fetchAttribution, fetchOverview, fetchWins } from "@/lib/api";
import {
  attributionInsight,
  cpstTrendInsight,
} from "@/lib/chart-insights";
import { pct, usd, usdCpst } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, winsData, attribution] = await Promise.all([
    fetchOverview(),
    fetchWins(),
    fetchAttribution(),
  ]);

  const spendTrend = data.spendTrend ?? [];
  const teams = data.teams ?? [];
  const orgCpstUsd = data.orgCpstUsd ?? 0;
  const cpstInsight = cpstTrendInsight(spendTrend);
  const attrInsight = attributionInsight(data.attributedSpendPct ?? 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader title="Overview">
        {data.periodLabel} · CPST v{data.metricVersion || "1.0"}
        {data.stableDays != null ? ` · stable window ${data.stableDays}d` : ""}
        {data.activeContract?.cfoApproved ? (
          <span className="ml-2 rounded bg-good-dim px-1.5 py-0.5 text-[10px]">contract v{data.activeContract.version} · CFO signed</span>
        ) : data.activeContract ? (
          <span className="ml-2 rounded bg-warm-dim px-1.5 py-0.5 text-[10px]">contract v{data.activeContract.version} · needs CFO sign-off</span>
        ) : null}
        {data.dataSource && data.dataSource !== "mock" ? (
          <span className="ml-2 rounded bg-accent-dim px-1.5 py-0.5 text-[10px] theme-accent">{data.dataSource}</span>
        ) : (
          <span className="ml-2 rounded bg-warm-dim px-1.5 py-0.5 text-[10px]">demo data — set OUTCOME_LEDGER_API_URL</span>
        )}
        {data.lastSync ? (
          <span className="mt-1 block text-xs theme-text-dim">
            Last sync: {data.lastSync.startedAt} ({data.lastSync.trigger})
          </span>
        ) : null}
      </PageHeader>

      <AttributionBanner attributedSpendPct={data.attributedSpendPct} />

      {attribution?.outcomeGraph ? (
        <OutcomeGraphPanel graph={attribution.outcomeGraph} />
      ) : null}

      {attribution && !attribution.meetsTarget && attribution.unassignedBySource.length > 0 ? (
        <div className="theme-panel rounded-xl p-4 text-sm theme-text-muted">
          <p className="font-medium" style={{ color: "var(--text)" }}>
            Unassigned spend by source
          </p>
          <ul className="mt-2 space-y-1">
            {attribution.unassignedBySource.map((row) => (
              <li key={row.source} className="flex justify-between tabular-nums">
                <span>{row.source}</span>
                <span className="theme-bad">{usd(row.spendUsd)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total AI spend"
          value={usd(data.totalSpendUsd)}
          hint="OpenAI, Anthropic, Cursor, Claude Code"
        />
        <MetricCard
          label="Stable outcomes"
          value={String(data.stableOutcomes ?? data.totalOutcomes)}
          hint={
            (data.pendingOutcomes ?? 0) > 0
              ? `${data.pendingOutcomes} pending stability window`
              : "Merged PRs, not reverted"
          }
          urgency="neutral"
        />
        <MetricCard
          label="Org CPST"
          value={usdCpst(data.orgCpstUsd)}
          hint={cpstInsight.detail}
          urgency={cpstInsight.urgency}
        />
        <MetricCard
          label="Attributed spend"
          value={pct(data.attributedSpendPct)}
          hint={`Failure cost share ${pct(data.failureCostShare)}`}
          urgency={attrInsight.urgency}
        />
      </div>

      <section className="theme-panel rounded-xl p-5">
        <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>
          CPST trend (weekly)
        </h2>
        <p className="mb-4 text-xs theme-text-muted">
          Fully loaded spend ÷ accepted outcomes — green when CPST falls week over week
        </p>
        <CpstChart data={spendTrend} />
      </section>

      <WinsPanel
        winDefinition={
          winsData.winDefinition ||
          (data as { winDefinition?: string }).winDefinition ||
          "Merged pull requests that count as accepted engineering wins."
        }
        wins={winsData.wins}
        limit={5}
        totalCount={(winsData as { total?: number }).total ?? winsData.wins.length}
        compact
      />

      <section className="theme-panel rounded-xl p-5">
        <h2 className="mb-4 text-sm font-medium" style={{ color: "var(--text)" }}>
          Teams
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="border-b text-xs uppercase theme-text-dim"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="pb-2 pr-4">Team</th>
                <th className="pb-2 pr-4">Spend</th>
                <th className="pb-2 pr-4">Outcomes</th>
                <th className="pb-2 pr-4">CPST</th>
                <th className="pb-2">Attributed</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr
                  key={t.teamId}
                  className="border-b theme-text-muted"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="py-3 pr-4 font-medium" style={{ color: "var(--text)" }}>
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
                  <td
                    className={`py-3 tabular-nums ${
                      t.attributedPct >= 80
                        ? "theme-good"
                        : t.attributedPct < 50
                          ? "theme-bad"
                          : ""
                    }`}
                  >
                    {pct(t.attributedPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.dataSource === "mock" || data.dataSource === "mock-fallback" ? (
        <p className="text-center text-xs theme-text-dim">
          Demo data · Run API sync with OpenAI + GitHub keys for live metrics
        </p>
      ) : null}
    </div>
  );
}
