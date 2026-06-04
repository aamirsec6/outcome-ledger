import { PageHeader } from "@/components/page-header";
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
      <PageHeader title="Reports">
        Board-ready export · metrics from store · human approval before PDF
        {live ? (
          <span className="ml-2 rounded bg-good-dim px-1.5 py-0.5 text-[10px]">live</span>
        ) : (
          <span className="ml-2 rounded bg-warm-dim px-1.5 py-0.5 text-[10px]">demo</span>
        )}
      </PageHeader>

      <ReportsPanel
        live={live}
        initialReport={latestReport}
        fallbackMemo={fallbackMemo}
      />
    </div>
  );
}
