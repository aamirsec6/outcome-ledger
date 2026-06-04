import { CheckCircle2, Circle, Upload } from "lucide-react";
import { ConnectWizard } from "@/components/connect-wizard";
import { GitHubConnectPanel } from "@/components/github-connect";
import { SpendCsvUpload } from "@/components/spend-csv-upload";
import { SyncAllButton } from "@/components/sync-all-button";
import { fetchOverview, fetchTeamMappings } from "@/lib/api";
import {
  connectGithubUrl,
  fetchAvailableRepos,
  fetchGithubStatus,
} from "@/lib/github-api";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const statusLabel = {
  connected: "Connected",
  csv: "CSV import",
  pending: "Not connected",
} as const;

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; login?: string }>;
}) {
  const [params, overview, mappings, githubStatus, available] = await Promise.all([
    searchParams,
    fetchOverview(),
    fetchTeamMappings(),
    fetchGithubStatus(),
    fetchGithubStatus().then(async (s) =>
      s.connected ? fetchAvailableRepos() : Promise.resolve({ repos: [] }),
    ),
  ]);
  const { integrations, attributedSpendPct, lastSync } = overview;

  const others = integrations.filter((i) => i.id !== "github");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect tools to ingest AI spend and engineering outcomes
        </p>
        {params.github === "connected" && params.login ? (
          <p className="mt-2 text-sm text-teal-400">
            GitHub connected as {params.login}. Select repos below.
          </p>
        ) : null}
      </header>

      <ConnectWizard
        integrations={integrations}
        githubConnected={githubStatus.connected}
        hasTeamMappings={mappings.length > 0}
        attributedSpendPct={attributedSpendPct}
        hasLastSync={Boolean(lastSync)}
      />

      <SyncAllButton />

      <GitHubConnectPanel
        connectUrl={connectGithubUrl()}
        status={githubStatus}
        availableRepos={available.repos || []}
      />

      <SpendCsvUpload
        source="cursor"
        label="Cursor spend"
        hint="Upload a CSV from Billing & Invoices (date + amount). Example: 2026-06-02, $23.60."
      />

      <SpendCsvUpload
        source="claude-code"
        label="Claude Code spend"
        hint="Upload usage or billing CSV with date and cost_usd columns."
      />

      <ul className="space-y-3">
        {others.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {i.status === "connected" ? (
                <CheckCircle2 className="h-5 w-5 text-teal-400" />
              ) : i.status === "csv" ? (
                <Upload className="h-5 w-5 text-amber-400" />
              ) : (
                <Circle className="h-5 w-5 text-slate-600" />
              )}
              <span className="font-medium text-white">{i.name}</span>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                i.status === "connected" && "bg-teal-500/15 text-teal-300",
                i.status === "csv" && "bg-amber-500/15 text-amber-300",
                i.status === "pending" && "bg-slate-800 text-slate-500",
              )}
            >
              {statusLabel[i.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
