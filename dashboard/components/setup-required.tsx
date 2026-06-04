import Link from "next/link";
import { ArrowRight, Cable, Github, Sparkles } from "lucide-react";

type Props = {
  reason?: string;
};

export function SetupRequired({ reason }: Props) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="theme-panel overflow-hidden rounded-2xl border border-[var(--border)] p-8 md:p-10">
        <div className="mb-6 inline-flex rounded-full bg-accent-dim p-3">
          <Sparkles className="h-6 w-6 theme-accent" style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="theme-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Set up your ledger first
        </h1>
        <p className="mt-3 text-base leading-relaxed theme-text-muted">
          Your workspace is ready, but we need a few connections before CPST and
          outcomes mean anything. This takes about five minutes.
        </p>
        {reason && reason !== "api_not_configured" ? (
          <p className="mt-2 text-xs theme-text-dim">
            Status: {reason.replace(/_/g, " ")}
          </p>
        ) : null}

        <ol className="mt-8 space-y-4 text-sm">
          <li className="flex gap-3">
            <Cable className="mt-0.5 h-4 w-4 shrink-0 theme-accent" />
            <span>Connect <strong>OpenAI</strong> (or upload spend CSV)</span>
          </li>
          <li className="flex gap-3">
            <Github className="mt-0.5 h-4 w-4 shrink-0 theme-accent" />
            <span>Connect <strong>GitHub</strong> and pick repos</span>
          </li>
          <li className="flex gap-3">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 theme-accent" />
            <span>Run your <strong>first sync</strong> — then Overview fills in</span>
          </li>
        </ol>

        <Link
          href="/onboarding"
          className="theme-accent-bg mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white"
        >
          Continue setup
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-4 text-center text-xs theme-text-dim">
        We never show demo spend on a real account — finish setup to see your numbers.
      </p>
    </div>
  );
}
