import Link from "next/link";
import { ExternalLink, Trophy } from "lucide-react";

export type Win = {
  id: string;
  status: string;
  winType: string;
  title: string;
  winSummary: string;
  repo: string;
  prNumber?: number;
  teamId?: string;
  mergedAt?: string;
  githubUrl?: string;
  labels?: string[];
  countsTowardCpst?: boolean;
};

const statusStyle: Record<string, string> = {
  accepted: "bg-teal-500/15 text-teal-300",
  pending_stable: "bg-amber-500/15 text-amber-300",
  reverted: "bg-red-500/15 text-red-300",
};

export function WinsPanel({
  winDefinition,
  wins,
  limit,
  totalCount,
  compact = false,
}: {
  winDefinition: string;
  wins: Win[];
  /** Max items to render (overview uses 5). Omit to show all. */
  limit?: number;
  totalCount?: number;
  compact?: boolean;
}) {
  const cap = limit ?? wins.length;
  const shown = wins.slice(0, cap);
  const total = totalCount ?? wins.length;
  const hidden = total > shown.length;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-slate-300">Wins — what got better</h2>
            {!compact ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
                {winDefinition}
              </p>
            ) : null}
          </div>
        </div>
        {hidden ? (
          <p className="shrink-0 text-xs text-slate-500">
            {shown.length} of {total} recent
          </p>
        ) : null}
      </div>

      {wins.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No outcomes in this period for selected repos. Check Settings win type
          (merged PR vs default-branch commit), merge or push on GitHub, then run
          full sync on Integrations.
        </p>
      ) : (
        <>
          <ul className={`mt-3 space-y-2 ${compact ? "" : "space-y-3"}`}>
            {shown.map((w) => (
              <li
                key={w.id}
                className={`rounded-lg border border-slate-800 bg-slate-950/60 ${
                  compact ? "px-3 py-2" : "px-4 py-3"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                      statusStyle[w.status] || "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {w.status.replace("_", " ")}
                  </span>
                  {w.teamId && !compact ? (
                    <span className="text-xs text-slate-500">team {w.teamId}</span>
                  ) : null}
                </div>
                <p
                  className={`mt-1 font-medium text-white ${
                    compact ? "text-xs line-clamp-2" : "text-sm"
                  }`}
                >
                  {w.winSummary}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {w.repo}
                  {w.prNumber ? ` #${w.prNumber}` : ""}
                  {w.mergedAt ? ` · ${w.mergedAt.slice(0, 10)}` : ""}
                </p>
                {w.githubUrl && !compact ? (
                  <a
                    href={w.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          {hidden ? (
            <p className="mt-3 text-xs text-slate-500">
              {total} stable outcomes in period — showing latest {shown.length}.{" "}
              <Link href="/integrations" className="text-teal-400 hover:text-teal-300">
                Sync
              </Link>{" "}
              updates the list.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
