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
}: {
  winDefinition: string;
  wins: Win[];
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start gap-2">
        <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
        <div>
          <h2 className="text-sm font-medium text-slate-300">Wins — what got better</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{winDefinition}</p>
        </div>
      </div>

      {wins.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No outcomes in this period for selected repos. Check Settings win type
          (merged PR vs default-branch commit), merge or push on GitHub, then run
          full sync on Integrations.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {wins.map((w) => (
            <li
              key={w.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                    statusStyle[w.status] || "bg-slate-800 text-slate-400"
                  }`}
                >
                  {w.status.replace("_", " ")}
                </span>
                {w.teamId ? (
                  <span className="text-xs text-slate-500">team {w.teamId}</span>
                ) : null}
                {w.countsTowardCpst ? (
                  <span className="text-xs text-teal-400">counts toward CPST</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-medium text-white">{w.winSummary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {w.repo}
                {w.prNumber ? ` #${w.prNumber}` : ""}
                {w.mergedAt ? ` · ${w.mergedAt.slice(0, 10)}` : ""}
              </p>
              {w.labels && w.labels.length > 0 ? (
                <p className="mt-1 text-xs text-slate-600">
                  Labels: {w.labels.join(", ")}
                </p>
              ) : null}
              {w.githubUrl ? (
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
      )}
    </section>
  );
}
