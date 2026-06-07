import { AttributionBanner } from "@/components/attribution-banner";
import { PageHeader } from "@/components/page-header";
import { TeamCard } from "@/components/team-card";
import { TeamsExplainer } from "@/components/teams-explainer";
import { fetchOverview } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { teams, attributedSpendPct, orgCpstUsd } = await fetchOverview();
  const totalWins = teams.reduce((n, t) => n + t.acceptedOutcomes, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Teams">
        Compare AI spend and shipped wins by squad — not a place to edit teams.
      </PageHeader>

      <TeamsExplainer />

      {totalWins === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-4 py-3 text-sm theme-text-muted">
          <span className="font-medium theme-heading">Heads up:</span> wins are still at zero
          org-wide. Until GitHub syncs merged PRs, cost per win will show as “—” on every card.
        </p>
      ) : null}

      <AttributionBanner attributedSpendPct={attributedSpendPct} />

      <div>
        <h2 className="mb-3 text-sm font-medium theme-heading">By team</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <TeamCard key={t.teamId} team={t} orgCpstUsd={orgCpstUsd} />
          ))}
        </div>
      </div>
    </div>
  );
}
