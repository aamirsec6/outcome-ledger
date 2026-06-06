import { CpstHistoryChart } from "@/components/cpst-history-chart";
import {
  OutcomeContractPanel,
  type OutcomeContract,
} from "@/components/outcome-contract-panel";
import { PageHeader } from "@/components/page-header";
import { fetchContractMoat, hasLiveApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const moat = hasLiveApi()
    ? await fetchContractMoat()
    : { contract: null, history: [], versions: [] };

  const contract = moat.contract as OutcomeContract | null;
  const versions = moat.versions as OutcomeContract[];
  const drafts = versions.filter((v) => v.status === "draft");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Win rules">
        What counts as a win, who signed off, and how cost per win is tracked over time
      </PageHeader>

      <OutcomeContractPanel contract={contract} draftVersions={drafts} />

      <section className="theme-panel p-5">
        <h3 className="theme-heading text-base font-medium">Cost per win history</h3>
        <p className="mt-1 text-sm theme-text-muted">
          Snapshots recorded after each sync. Comparable month-over-month once you have a few
          cycles — switching vendors means re-trust, not a weekend migration.
        </p>
        <div className="mt-4">
          <CpstHistoryChart data={moat.history || []} />
        </div>
        {(moat.history || []).length > 0 ? (
          <table className="theme-table mt-4 w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4">Contract</th>
                <th className="py-2 pr-4">Outcomes</th>
                <th className="py-2">CPST</th>
              </tr>
            </thead>
            <tbody>
              {[...(moat.history || [])].reverse().map((row) => (
                <tr key={row.period}>
                  <td className="py-2 pr-4 theme-heading">{row.period}</td>
                  <td className="py-2 pr-4">v{row.contractVersion || "—"}</td>
                  <td className="py-2 pr-4">{row.stableOutcomes}</td>
                  <td className="py-2 theme-accent">${row.cpstUsd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
