import { MetricCard } from "@/components/metric-card";
import { fetchOverview } from "@/lib/api";
import { pct, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { teams } = await fetchOverview();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Teams</h1>
        <p className="mt-1 text-sm text-slate-400">
          Compare cost per accepted outcome by engineering team
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((t) => (
          <article
            key={t.teamId}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
          >
            <h2 className="text-lg font-medium text-white">{t.teamName}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricCard label="CPST" value={usd(t.cpstUsd)} accent="teal" />
              <MetricCard
                label="Failure cost"
                value={pct(t.failureCostShare)}
                hint="Failed runs in numerator"
                accent="amber"
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-400">
              <div>
                <dt>Spend</dt>
                <dd className="font-medium text-slate-200">
                  {usd(t.spendUsd)}
                </dd>
              </div>
              <div>
                <dt>Outcomes</dt>
                <dd className="font-medium text-slate-200">
                  {t.acceptedOutcomes}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
