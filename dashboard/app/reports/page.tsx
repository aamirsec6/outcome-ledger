import { FileDown } from "lucide-react";
import { fetchOverview, hasLiveApi } from "@/lib/api";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

function buildExecutiveMemo(data: Awaited<ReturnType<typeof fetchOverview>>): string {
  const isLive = data.dataSource === "live";
  const title = isLive ? "Executive summary" : "Executive summary (demo)";

  const lines = [
    title,
    "",
    `Period: ${data.periodLabel}`,
    `Total AI spend: ${usd(data.totalSpendUsd)}`,
    `Metric version: CPST v${data.metricVersion || "1.0"}`,
    `Stable outcomes: ${data.stableOutcomes ?? data.totalOutcomes}`,
    `Pending (< stable window): ${data.pendingOutcomes ?? 0}`,
    `Reverted: ${data.revertedOutcomes ?? 0}`,
    `Organization CPST: ${usd(data.orgCpstUsd)}`,
    "",
  ];

  if (data.totalOutcomes === 0 && data.totalSpendUsd > 0) {
    lines.push(
      "Key finding: Spend is recorded but no accepted outcomes yet — connect GitHub and sync merged PRs, or widen the lookback window.",
      "",
    );
  } else if (data.teams.length > 0) {
    const sorted = [...data.teams].sort((a, b) => b.cpstUsd - a.cpstUsd);
    const top = sorted[0];
    const median =
      sorted.length > 1
        ? sorted[Math.floor(sorted.length / 2)].cpstUsd
        : top.cpstUsd;
    if (top.cpstUsd > 0 && median > 0 && top.cpstUsd > median * 1.2) {
      lines.push(
        `Key finding: ${top.teamName} CPST (${usd(top.cpstUsd)}) is above the org median — review retry loops and review burden on that squad.`,
        "",
      );
    } else {
      lines.push(
        `Key finding: ${data.totalOutcomes} accepted outcome(s) in period; org CPST is ${usd(data.orgCpstUsd)}.`,
        "",
      );
    }
  } else {
    lines.push(
      `Key finding: ${data.totalOutcomes} accepted outcome(s) in period; org CPST is ${usd(data.orgCpstUsd)}.`,
      "",
    );
  }

  lines.push(
    `Attributed spend: ${data.attributedSpendPct}% of total (target ≥80%).`,
    "",
  );

  const pending = data.integrations
    .filter((i) => i.status === "pending")
    .map((i) => i.name);
  if (pending.length > 0) {
    lines.push(
      `Recommendation: Connect remaining sources (${pending.join(", ")}) for a complete CPST picture.`,
    );
  } else {
    lines.push(
      "Recommendation: Keep syncing GitHub and billing sources monthly; export PDF when enabled in Phase 1.",
    );
  }

  lines.push(
    "",
    isLive
      ? "— Generated from live metrics in Outcome Ledger (LLM narrative layer in Phase 1)."
      : "— Demo template only. Set OUTCOME_LEDGER_API_URL on the dashboard for live data.",
  );

  return lines.join("\n");
}

export default async function ReportsPage() {
  const data = await fetchOverview();
  const memo = buildExecutiveMemo(data);
  const live = hasLiveApi() && data.dataSource === "live";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reports</h1>
          <p className="mt-1 text-sm text-slate-400">
            Board-ready export · numbers from metrics store
            {live ? (
              <span className="ml-2 rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] text-teal-300">
                live
              </span>
            ) : (
              <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                demo
              </span>
            )}
          </p>
        </div>
        {live && process.env.OUTCOME_LEDGER_API_URL ? (
          <a
            href="/api/reports/export"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </a>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white opacity-60"
            disabled
            title="Connect API for export"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </header>

      <pre className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-relaxed text-slate-300">
        {memo}
      </pre>
    </div>
  );
}
