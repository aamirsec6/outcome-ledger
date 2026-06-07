import Link from "next/link";
import { ArrowRight, FolderGit2, Sparkles, Trophy } from "lucide-react";

export function TeamsExplainer() {
  return (
    <section className="theme-panel rounded-xl p-5">
      <h2 className="text-sm font-medium theme-heading">What is this page?</h2>
      <p className="mt-2 text-sm theme-text-muted">
        Teams groups your <strong className="font-medium theme-heading">AI spend</strong> and{" "}
        <strong className="font-medium theme-heading">shipped wins</strong> so you can compare
        squads — who is spending, who is shipping, and who is efficient.
      </p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        <li className="theme-inset flex gap-3 rounded-lg p-3">
          <FolderGit2 className="mt-0.5 h-4 w-4 shrink-0 theme-accent" />
          <div>
            <p className="text-xs font-medium theme-heading">1. Tag repos</p>
            <p className="mt-0.5 text-xs theme-text-dim">
              Map each GitHub repo to a team name in Settings.
            </p>
          </div>
        </li>
        <li className="theme-inset flex gap-3 rounded-lg p-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 theme-accent" />
          <div>
            <p className="text-xs font-medium theme-heading">2. Connect & sync</p>
            <p className="mt-0.5 text-xs theme-text-dim">
              Pull AI bills and merged PRs from Connect.
            </p>
          </div>
        </li>
        <li className="theme-inset flex gap-3 rounded-lg p-3">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 theme-accent" />
          <div>
            <p className="text-xs font-medium theme-heading">3. Compare here</p>
            <p className="mt-0.5 text-xs theme-text-dim">
              Spend ÷ wins = cost per win for each team.
            </p>
          </div>
        </li>
      </ol>

      <Link
        href="/settings?section=teams"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium theme-accent hover:underline"
      >
        Set up team tags
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
