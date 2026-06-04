import { ReportsPanel } from "@/components/reports-panel";
import { fetchLatestExecutiveReport, fetchOverview, hasLiveApi } from "@/lib/api";
import { usd, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

function buildFallbackMemo(
  data: Awaited<ReturnType<typeof fetchOverview>>,
): string {
  const lines = [
    "Executive summary (preview)",
    "",
    `Period: ${data.periodLabel}`,
    `Total AI spend: ${usd(data.totalSpendUsd)}`,
    `Organization CPST: ${usd(data.orgCpstUsd)}`,
    `Attributed spend: ${pct(data.attributedSpendPct)}`,
    "",
    "Click Generate narrative when connected to the API.",
  ];
  return lines.join("\n");
}

export default async function ReportsPage() {
  const [data, latestReport] = await Promise.all([
    fetchOverview(),
    fetchLatestExecutiveReport(),
  ]);
  const live = hasLiveApi() && data.dataSource === "live";
  const fallbackMemo = buildFallbackMemo(data);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Board-ready export · metrics from store · human approval before PDF
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
      </header>

      <ReportsPanel
        live={live}
        initialReport={latestReport}
        fallbackMemo={fallbackMemo}
      />
    </div>
  );
}
