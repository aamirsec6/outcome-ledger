import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { attributionInsight } from "@/lib/chart-insights";
import { usd, usdCpst, pct } from "@/lib/format";

type TeamRow = {
  teamId: string;
  teamName: string;
  spendUsd: number;
  acceptedOutcomes: number;
  cpstUsd: number;
  attributedPct: number;
};

export function TeamCard({
  team,
  orgCpstUsd,
}: {
  team: TeamRow;
  orgCpstUsd: number;
}) {
  const isUnassigned = team.teamId === "unassigned" || team.teamName.toLowerCase() === "unassigned";
  const hasWins = team.acceptedOutcomes > 0;

  const cpstUrgency =
    !hasWins
      ? "neutral"
      : team.cpstUsd > orgCpstUsd * 1.15
        ? "bad"
        : team.cpstUsd < orgCpstUsd * 0.85
          ? "good"
          : "neutral";

  const attrUrgency = attributionInsight(team.attributedPct).urgency;

  const cpstValue = hasWins ? usdCpst(team.cpstUsd) : "—";
  const cpstHint = hasWins
    ? "AI spend for each shipped win"
    : "No wins yet — connect GitHub and sync merged PRs";

  return (
    <article className="theme-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium theme-heading">{team.teamName}</h2>
          <p className="mt-0.5 text-xs theme-text-dim">
            {isUnassigned
              ? "Spend or wins we could not match to a named team"
              : `Repos tagged as “${team.teamId}” roll up here`}
          </p>
        </div>
        {isUnassigned ? (
          <Link
            href="/settings?section=teams"
            className="shrink-0 text-xs font-medium theme-accent hover:underline"
          >
            Tag repos
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricCard
          label="Cost per win"
          value={cpstValue}
          hint={cpstHint}
          urgency={cpstUrgency}
        />
        <MetricCard
          label="Spend confidence"
          value={pct(team.attributedPct)}
          hint={
            isUnassigned
              ? "Lower means more spend needs a team tag"
              : "How sure we are this spend belongs here"
          }
          urgency={attrUrgency}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 text-sm">
        <div>
          <dt className="theme-text-dim">AI spend</dt>
          <dd className="mt-0.5 font-medium tabular-nums theme-heading">
            {usd(team.spendUsd)}
          </dd>
          <p className="mt-0.5 text-xs theme-text-dim">Cursor, OpenAI, etc.</p>
        </div>
        <div>
          <dt className="theme-text-dim">Wins shipped</dt>
          <dd className="mt-0.5 font-medium tabular-nums theme-heading">
            {team.acceptedOutcomes}
          </dd>
          <p className="mt-0.5 text-xs theme-text-dim">Merged PRs from their repos</p>
        </div>
      </dl>

      {!hasWins && !isUnassigned ? (
        <p className="mt-3 rounded-lg theme-inset px-3 py-2 text-xs theme-text-muted">
          No wins yet? Check that GitHub is connected, repos are mapped to this team, then run{" "}
          <Link href="/integrations" className="theme-accent hover:underline">
            Sync
          </Link>
          .
        </p>
      ) : null}
    </article>
  );
}
