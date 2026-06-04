import { CpstChart } from "@/components/cpst-chart";
import { MetricCard } from "@/components/metric-card";
import { WinsPanel } from "@/components/wins-panel";
import { fetchOverview, fetchWins } from "@/lib/api";
import { pct, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, winsData] = await Promise.all([fetchOverview(), fetchWins()]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          {data.periodLabel} · CPST v{data.metricVersion || "1.0"}
          {data.stableDays != null ? ` · stable window ${data.stableDays}d` : ""}
          {data.activeContract?.cfoApproved ? (
            <span className="ml-2 rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] text-teal-300">
              contract v{data.activeContract.version} · CFO signed
            </span>
          ) : data.activeContract ? (
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
              contract v{data.activeContract.version} · needs CFO sign-off
            </span>
          ) : null}
          {data.dataSource && data.dataSource !== "mock" ? (
            <span className="ml-2 rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] text-teal-300">
              {data.dataSource}
            </span>
          ) : (
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
              demo data — set OUTCOME_LEDGER_API_URL
            </span>
          )}
        </p>
        {data.lastSync ? (
          <p className="mt-1 text-xs text-slate-500">
            Last sync: {data.lastSync.startedAt} ({data.lastSync.trigger})
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total AI spend"
          value={usd(data.totalSpendUsd)}
          hint="OpenAI, Anthropic, Cursor, Claude Code"
          accent="slate"
        />
        <MetricCard
          label="Stable outcomes"
          value={String(data.stableOutcomes ?? data.totalOutcomes)}
          hint={
            (data.pendingOutcomes ?? 0) > 0
              ? `${data.pendingOutcomes} pending stability window`
              : "Merged PRs, not reverted"
          }
        />
        <MetricCard
          label="Org CPST"
          value={usd(data.orgCpstUsd)}
          hint="Cost per successful outcome"
          accent="teal"
        />
        <MetricCard
          label="Attributed spend"
          value={pct(data.attributedSpendPct)}
          hint={`Failure cost share ${pct(data.failureCostShare)}`}
          accent="amber"
        />
      </div>

      <WinsPanel
        winDefinition={
          winsData.winDefinition ||
          (data as { winDefinition?: string }).winDefinition ||
          "Merged pull requests that count as accepted engineering wins."
        }
        wins={winsData.wins}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-sm font-medium text-slate-300">
          CPST trend (weekly)
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Fully loaded spend ÷ accepted outcomes — deterministic, not LLM-estimated
        </p>
        <CpstChart data={data.spendTrend} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-sm font-medium text-slate-300">Teams</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-4">Team</th>
                <th className="pb-2 pr-4">Spend</th>
                <th className="pb-2 pr-4">Outcomes</th>
                <th className="pb-2 pr-4">CPST</th>
                <th className="pb-2">Attributed</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((t) => (
                <tr
                  key={t.teamId}
                  className="border-b border-slate-800/60 text-slate-300"
                >
                  <td className="py-3 pr-4 font-medium text-white">
                    {t.teamName}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{usd(t.spendUsd)}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {t.acceptedOutcomes}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-teal-400">
                    {usd(t.cpstUsd)}
                  </td>
                  <td className="py-3 tabular-nums">{pct(t.attributedPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.dataSource === "mock" || data.dataSource === "mock-fallback" ? (
        <p className="text-center text-xs text-slate-600">
          Demo data · Run API sync with OpenAI + GitHub keys for live metrics
        </p>
      ) : null}
    </div>
  );
}
