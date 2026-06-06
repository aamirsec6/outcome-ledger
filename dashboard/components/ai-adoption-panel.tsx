import { pct, usd } from "@/lib/format";
import type { AiAdoptionReport } from "@/lib/api";

type Props = {
  report: AiAdoptionReport | null;
};

export function AiAdoptionPanel({ report }: Props) {
  if (!report) return null;

  const shipped = report.shippedWork;
  const split = report.aiVsHuman;
  const summary = report.adoptionSummary;
  const maxWeekly = Math.max(
    1,
    ...shipped.weeklyTrend.map((w) => w.outcomes),
  );

  return (
    <section className="theme-panel space-y-5 rounded-xl p-5">
      <div>
        <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>
          AI adoption &amp; output
        </h2>
        <p className="mt-1 text-xs theme-text-muted">
          How much you shipped, which AI tools are in use, and estimated AI-assisted wins.
        </p>
      </div>

      {report.codeAttribution?.available ? (
        (() => {
          const code = report.codeAttribution!;
          const aiLines = code.aiLines ?? 0;
          const humanLines = code.humanLines ?? 0;
          const aiPct = code.aiPct ?? 0;
          const humanPct = code.humanPct ?? 0;
          return (
        <div className="rounded-lg border border-[var(--border)] p-4">
          <p className="text-xs font-medium theme-text-dim">AI vs human code (lines)</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="bg-[var(--accent)]"
              style={{ width: `${aiPct}%` }}
              title={`AI ${aiPct}%`}
            />
            <div
              className="bg-[var(--border)]"
              style={{ width: `${humanPct}%` }}
              title={`Human ${humanPct}%`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm tabular-nums">
            <span>
              <span className="theme-accent">AI </span>
              {aiLines.toLocaleString()} lines ({pct(aiPct)})
            </span>
            <span>
              <span className="theme-text-muted">Human </span>
              {humanLines.toLocaleString()} lines ({pct(humanPct)})
            </span>
          </div>
          <p className="mt-2 text-xs theme-text-dim">
            {code.confidenceNote} ({code.prsCounted ?? 0} PRs/commits)
          </p>
        </div>
          );
        })()
      ) : (
        <p className="text-sm theme-text-muted">
          {report.codeAttribution?.reason ||
            "Run Sync after GitHub + Cursor spend to compute AI vs human code lines."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs theme-text-dim">Shipped work</p>
          <p className="mt-1 text-2xl font-medium tabular-nums theme-heading">
            {shipped.stableOutcomes}
          </p>
          <p className="text-xs theme-text-muted">
            {shipped.outcomesPerWeek}/week avg
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs theme-text-dim">AI-assisted wins</p>
          <p className="mt-1 text-2xl font-medium tabular-nums theme-heading">
            {pct(split.aiAssistedPct)}
          </p>
          <p className="text-xs theme-text-muted">
            {split.aiAssistedOutcomes} of {shipped.stableOutcomes} wins
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs theme-text-dim">AI tools active</p>
          <p className="mt-1 text-2xl font-medium tabular-nums theme-heading">
            {summary.toolsInUse}
          </p>
          <p className="text-xs theme-text-muted">
            {summary.activeAiUsers} billed user
            {summary.activeAiUsers === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium theme-text-dim">Output per week</p>
        <div className="flex h-24 items-end gap-2">
          {shipped.weeklyTrend.map((w) => (
            <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[var(--accent)]/70"
                style={{
                  height: `${Math.max(8, (w.outcomes / maxWeekly) * 100)}%`,
                }}
                title={`${w.outcomes} wins`}
              />
              <span className="text-[10px] theme-text-dim">{w.week}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium theme-text-dim">Adoption by tool</p>
          {report.adoptionByTool.length === 0 ? (
            <p className="text-sm theme-text-muted">No AI spend ingested yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase theme-text-dim" style={{ borderColor: "var(--border)" }}>
                  <th className="pb-2 pr-3">Tool</th>
                  <th className="pb-2 pr-3">Spend</th>
                  <th className="pb-2 pr-3">Share</th>
                  <th className="pb-2">Users</th>
                </tr>
              </thead>
              <tbody>
                {report.adoptionByTool.map((t) => (
                  <tr
                    key={t.toolId}
                    className="border-b theme-text-muted"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="py-2 pr-3 font-medium" style={{ color: "var(--text)" }}>
                      {t.toolName}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{usd(t.spendUsd)}</td>
                    <td className="py-2 pr-3 tabular-nums">{pct(t.spendSharePct)}</td>
                    <td className="py-2 tabular-nums">{t.activeUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium theme-text-dim">AI vs human (estimate)</p>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="theme-text-muted">AI-assisted wins</span>
              <span className="tabular-nums theme-good">{split.aiAssistedOutcomes}</span>
            </li>
            <li className="flex justify-between">
              <span className="theme-text-muted">Human-only wins</span>
              <span className="tabular-nums">{split.humanOnlyOutcomes}</span>
            </li>
            {split.unknownAuthorOutcomes > 0 ? (
              <li className="flex justify-between">
                <span className="theme-text-muted">Unknown author</span>
                <span className="tabular-nums">{split.unknownAuthorOutcomes}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      {report.byTeam.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium theme-text-dim">By team</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase theme-text-dim" style={{ borderColor: "var(--border)" }}>
                <th className="pb-2 pr-3">Team</th>
                <th className="pb-2 pr-3">Wins</th>
                <th className="pb-2 pr-3">AI-assisted</th>
                <th className="pb-2">Spend</th>
              </tr>
            </thead>
            <tbody>
              {report.byTeam.map((t) => (
                <tr
                  key={t.teamId}
                  className="border-b theme-text-muted"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="py-2 pr-3 font-medium" style={{ color: "var(--text)" }}>
                    {t.teamName}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{t.outcomes}</td>
                  <td className="py-2 pr-3 tabular-nums">{pct(t.aiAssistedPct)}</td>
                  <td className="py-2 tabular-nums">{usd(t.spendUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs theme-text-dim">{report.methodNote}</p>
    </section>
  );
}
