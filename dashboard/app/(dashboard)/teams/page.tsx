import { AttributionBanner } from "@/components/attribution-banner";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { fetchOverview } from "@/lib/api";
import { attributionInsight } from "@/lib/chart-insights";
import { pct, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { teams, attributedSpendPct, orgCpstUsd } = await fetchOverview();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Teams">
        Spend, wins, and cost per win — by team
      </PageHeader>

      <AttributionBanner attributedSpendPct={attributedSpendPct} />

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((t) => {
          const cpstUrgency =
            t.cpstUsd > orgCpstUsd * 1.15
              ? "bad"
              : t.cpstUsd < orgCpstUsd * 0.85
                ? "good"
                : "neutral";
          const attrUrgency = attributionInsight(t.attributedPct).urgency;
          return (
            <article key={t.teamId} className="theme-panel rounded-xl p-5">
              <h2 className="text-lg font-medium" style={{ color: "var(--text)" }}>
                {t.teamName}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricCard
                  label="Cost per win"
                  value={usd(t.cpstUsd)}
                  urgency={cpstUrgency}
                />
                <MetricCard
                  label="Spend tagged"
                  value={pct(t.attributedPct)}
                  hint="Share tied to this team"
                  urgency={attrUrgency}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm theme-text-muted">
                <div>
                  <dt>Spend</dt>
                  <dd className="font-medium" style={{ color: "var(--text)" }}>
                    {usd(t.spendUsd)}
                  </dd>
                </div>
                <div>
                  <dt>Wins</dt>
                  <dd className="font-medium" style={{ color: "var(--text)" }}>
                    {t.acceptedOutcomes}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
