import Link from "next/link";
import { ExternalLink, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

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

const statusClass: Record<string, string> = {
  accepted: "bg-good-dim",
  pending_stable: "bg-warm-dim",
  reverted: "bg-bad-dim",
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
  limit?: number;
  totalCount?: number;
  compact?: boolean;
}) {
  const cap = limit ?? wins.length;
  const shown = wins.slice(0, cap);
  const total = totalCount ?? wins.length;
  const hidden = total > shown.length;

  return (
    <section className="theme-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Trophy className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <h2 className="theme-heading text-sm font-medium">Wins — what got better</h2>
            {!compact ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed theme-text-muted">
                {winDefinition}
              </p>
            ) : null}
          </div>
        </div>
        {hidden ? (
          <p className="shrink-0 text-xs theme-text-dim">
            {shown.length} of {total} recent
          </p>
        ) : null}
      </div>

      {wins.length === 0 ? (
        <p className="mt-4 text-sm theme-text-muted">
          No outcomes in this period for selected repos. Check Settings win type
          (merged PR vs default-branch commit), merge or push on GitHub, then run
          full sync on Integrations.
        </p>
      ) : (
        <>
          <ul className={cn("mt-3", compact ? "space-y-2" : "space-y-3")}>
            {shown.map((w) => (
              <li
                key={w.id}
                className={cn("theme-inset", compact ? "px-3 py-2" : "px-4 py-3")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                      statusClass[w.status] || "theme-badge-neutral",
                    )}
                  >
                    {w.status.replace("_", " ")}
                  </span>
                  {w.teamId && !compact ? (
                    <span className="text-xs theme-text-dim">team {w.teamId}</span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "theme-heading mt-1 font-medium",
                    compact ? "line-clamp-2 text-xs" : "text-sm",
                  )}
                >
                  {w.winSummary}
                </p>
                <p className="mt-0.5 truncate text-xs theme-text-dim">
                  {w.repo}
                  {w.prNumber ? ` #${w.prNumber}` : ""}
                  {w.mergedAt ? ` · ${w.mergedAt.slice(0, 10)}` : ""}
                </p>
                {w.githubUrl && !compact ? (
                  <a
                    href={w.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-accent mt-2 inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          {hidden ? (
            <p className="mt-3 text-xs theme-text-dim">
              {total} stable outcomes in period — showing latest {shown.length}.{" "}
              <Link href="/integrations" className="theme-accent hover:underline">
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
