import { PageHeader } from "@/components/page-header";
import { ReportsPanel } from "@/components/reports-panel";
import { fetchLatestExecutiveReport, fetchOverview, hasLiveApi } from "@/lib/api";
import { usd, pct, usdCpst } from "@/lib/format";

export const dynamic = "force-dynamic";

function buildFallbackMemo(
  data: Awaited<ReturnType<typeof fetchOverview>>,
): string {
  const lines = [
    "Executive summary (preview)",
    "",
    `Period: ${data.periodLabel}`,
    `Total AI spend: ${usd(data.totalSpendUsd)}`,
    `Cost per win: ${usdCpst(data.orgCpstUsd)}`,
    `Spend tagged to teams: ${pct(data.attributedSpendPct)}`,
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Reports">
        Summary for leadership — review, approve, then download PDF or CSV
      </PageHeader>

      <ReportsPanel
        live={live}
        initialReport={latestReport}
        fallbackMemo={fallbackMemo}
      />
    </div>
  );
}
