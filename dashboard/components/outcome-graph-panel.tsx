import { GitBranch } from "lucide-react";
import { urgencyClasses } from "@/lib/chart-insights";
import { usd, pct } from "@/lib/format";
import { cn } from "@/lib/cn";

export type OutcomeGraph = {
  outcomeCount: number;
  linkedSpendUsd: number;
  unlinkedSpendUsd: number;
  outcomeLinkedSpendPct: number;
  avgLinkConfidence: number;
  windowBeforeDays: number;
  windowAfterDays: number;
  sampleLinks: {
    outcomeId: string;
    repo: string;
    teamId: string | null;
    occurredAt: string;
    linkedSpendUsd: number;
    confidence: number;
    method: string;
  }[];
};

export function OutcomeGraphPanel({ graph }: { graph: OutcomeGraph }) {
  const pctLinked = graph.outcomeLinkedSpendPct;
  const urgency =
    pctLinked >= 60 ? "good" : pctLinked >= 30 ? "warn" : "bad";

  return (
    <section className="theme-panel rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <GitBranch className="h-5 w-5 shrink-0 theme-accent" style={{ color: "var(--accent)" }} />
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Outcome-linked spend
          </h2>
          <p className="text-xs theme-text-muted">
            Spend in ±{graph.windowBeforeDays}/{graph.windowAfterDays}d window around each accepted outcome
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cn("rounded-lg px-3 py-2 text-sm", urgencyClasses(urgency))}>
          <p className="text-xs theme-text-muted">Linked to outcomes</p>
          <p className="text-lg font-semibold tabular-nums">
            {pct(pctLinked)}
          </p>
          <p className="text-xs theme-text-dim">{usd(graph.linkedSpendUsd)}</p>
        </div>
        <div className="theme-card rounded-lg px-3 py-2 text-sm">
          <p className="text-xs theme-text-muted">Unlinked spend</p>
          <p className="text-lg font-semibold tabular-nums">
            {usd(graph.unlinkedSpendUsd)}
          </p>
        </div>
        <div className="theme-card rounded-lg px-3 py-2 text-sm">
          <p className="text-xs theme-text-muted">Avg link confidence</p>
          <p className="text-lg font-semibold tabular-nums">
            {Math.round(graph.avgLinkConfidence * 100)}%
          </p>
          <p className="text-xs theme-text-dim">
            {graph.outcomeCount} outcomes in window
          </p>
        </div>
      </div>
      {graph.sampleLinks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="theme-text-dim border-b" style={{ borderColor: "var(--border)" }}>
                <th className="pb-2 pr-3">Repo</th>
                <th className="pb-2 pr-3">Linked spend</th>
                <th className="pb-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {graph.sampleLinks.slice(0, 8).map((l) => (
                <tr
                  key={l.outcomeId}
                  className="border-b"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  <td className="py-2 pr-3 font-medium" style={{ color: "var(--text)" }}>
                    {l.repo}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{usd(l.linkedSpendUsd)}</td>
                  <td className="py-2 tabular-nums">
                    <span
                      className={
                        l.confidence >= 0.85
                          ? "theme-good"
                          : l.confidence >= 0.65
                            ? ""
                            : "theme-bad"
                      }
                    >
                      {Math.round(l.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
