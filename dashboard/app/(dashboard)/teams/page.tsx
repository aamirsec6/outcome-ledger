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
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Teams">
        Compare cost per accepted outcome by engineering team
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
                  label="CPST"
                  value={usd(t.cpstUsd)}
                  urgency={cpstUrgency}
                />
                <MetricCard
                  label="Failure cost"
                  value={pct(t.failureCostShare)}
                  hint="Failed runs in numerator"
                  urgency={t.failureCostShare > 25 ? "bad" : "good"}
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
                  <dt>Outcomes</dt>
                  <dd className="font-medium" style={{ color: "var(--text)" }}>
                    {t.acceptedOutcomes}
                  </dd>
                </div>
                <div>
                  <dt>Attributed</dt>
                  <dd
                    className={`font-medium ${
                      attrUrgency === "good"
                        ? "theme-good"
                        : attrUrgency === "bad"
                          ? "theme-bad"
                          : ""
                    }`}
                    style={
                      attrUrgency === "warn" ? { color: "var(--warm)" } : undefined
                    }
                  >
                    {pct(t.attributedPct)}
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
