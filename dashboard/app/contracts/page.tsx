import { CpstHistoryChart } from "@/components/cpst-history-chart";
import {
  OutcomeContractPanel,
  type OutcomeContract,
} from "@/components/outcome-contract-panel";
import { fetchContractMoat, hasLiveApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const moat = hasLiveApi()
    ? await fetchContractMoat()
    : { contract: null, history: [], versions: [] };

  const contract = moat.contract as OutcomeContract | null;
  const drafts = (moat.versions || []).filter(
    (v: OutcomeContract) => v.status === "draft",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Outcome contract</h1>
        <p className="mt-1 text-sm text-slate-400">
          Versioned definition of a win · CFO sign-off · immutable CPST history
        </p>
      </header>

      <OutcomeContractPanel contract={contract} draftVersions={drafts} />

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="font-medium text-white">CPST history (monthly)</h3>
        <p className="mt-1 text-sm text-slate-400">
          Snapshots recorded after each sync. Comparable month-over-month once you have a few
          cycles — switching vendors means re-trust, not a weekend migration.
        </p>
        <div className="mt-4">
          <CpstHistoryChart data={moat.history || []} />
        </div>
        {(moat.history || []).length > 0 ? (
          <table className="mt-4 w-full text-left text-xs text-slate-400">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4">Contract</th>
                <th className="py-2 pr-4">Outcomes</th>
                <th className="py-2">CPST</th>
              </tr>
            </thead>
            <tbody>
              {[...(moat.history || [])].reverse().map((row) => (
                <tr key={row.period} className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-300">{row.period}</td>
                  <td className="py-2 pr-4">v{row.contractVersion || "—"}</td>
                  <td className="py-2 pr-4">{row.stableOutcomes}</td>
                  <td className="py-2 text-teal-300">${row.cpstUsd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
