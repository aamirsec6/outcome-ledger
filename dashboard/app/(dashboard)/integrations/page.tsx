import { CheckCircle2, Circle, Upload } from "lucide-react";
import { ConnectWizard } from "@/components/connect-wizard";
import { McpSetupPanel } from "@/components/mcp-setup-panel";
import { GitHubConnectPanel } from "@/components/github-connect";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader title="Integrations">
        Connect tools to ingest AI spend and engineering outcomes
        {params.github === "connected" && params.login ? (
          <span className="mt-2 block theme-accent">
            GitHub connected as {params.login}. Select repos below.
          </span>
        ) : null}
      </PageHeader>

      <ConnectWizard
        integrations={integrations}
        githubConnected={githubStatus.connected}
        hasTeamMappings={mappings.length > 0}
        attributedSpendPct={attributedSpendPct}
        hasLastSync={Boolean(lastSync)}
      />

      <SyncAllButton />

      <McpSetupPanel />

      <GitHubConnectPanel
        connectUrl={connectGithubUrl()}
        status={githubStatus}
        availableRepos={available.repos || []}
      />

      <SpendCsvUpload
        source="openai"
        label="OpenAI spend (CSV)"
        hint="Use when service account keys cannot read billing API. CSV: date, cost_usd (see docs/openai-setup.md)."
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
            className="theme-panel flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {i.status === "connected" ? (
                <CheckCircle2 className="theme-icon h-5 w-5" />
              ) : i.status === "csv" ? (
                <Upload className="h-5 w-5" style={{ color: "var(--warm)" }} />
              ) : (
                <Circle className="h-5 w-5 theme-text-dim" />
              )}
              <span className="theme-heading font-medium">{i.name}</span>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                i.status === "connected" && "bg-good-dim",
                i.status === "csv" && "bg-warm-dim",
                i.status === "pending" && "theme-badge-neutral",
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
