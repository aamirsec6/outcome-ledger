import { ConnectWizard } from "@/components/connect-wizard";
import { CursorConnectPanel } from "@/components/cursor-connect";
import { GitHubConnectPanel } from "@/components/github-connect";
import { IntegrationConnectHub } from "@/components/integration-connect-hub";
import { PageHeader } from "@/components/page-header";
import { SpendCsvUpload } from "@/components/spend-csv-upload";
import { SyncAllButton } from "@/components/sync-all-button";
import { fetchOverview, fetchTeamMappings } from "@/lib/api";
import type { IntegrationId } from "@/lib/integrations-catalog";
import {
  connectGithubUrl,
  fetchAvailableRepos,
  fetchGithubStatus,
  installGithubAppUrl,
} from "@/lib/github-api";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; github_app?: string; login?: string; repos?: string }>;
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

  const cursorConfigured =
    integrations.find((i) => i.id === "cursor")?.status === "connected";

  const panels: Partial<Record<IntegrationId, React.ReactNode>> = {
    github: (
      <GitHubConnectPanel
        connectUrl={connectGithubUrl()}
        installAppUrl={installGithubAppUrl()}
        status={githubStatus}
        availableRepos={available.repos || []}
      />
    ),
    cursor: (
      <div className="space-y-4">
        <CursorConnectPanel configured={cursorConfigured} />
        <SpendCsvUpload
          embedded
          source="cursor"
          label="Cursor"
          hint="No Team API yet? Export from Billing & Invoices and upload a CSV."
        />
      </div>
    ),
    openai: (
      <SpendCsvUpload
        embedded
        source="openai"
        label="OpenAI"
        hint="Upload a billing CSV with date and amount columns."
      />
    ),
    anthropic: (
      <SpendCsvUpload
        embedded
        source="anthropic"
        label="Anthropic"
        hint="Upload a usage or billing CSV with date and cost_usd."
      />
    ),
    "claude-code": (
      <SpendCsvUpload
        embedded
        source="claude-code"
        label="Claude Code"
        hint="Upload a usage or billing CSV with date and cost."
      />
    ),
    copilot: (
      <SpendCsvUpload
        embedded
        source="copilot"
        label="Copilot"
        hint="Export Copilot billing from GitHub org settings, then upload CSV."
      />
    ),
    langfuse: (
      <p className="rounded-lg theme-inset px-4 py-3 text-sm theme-text-muted">
        Langfuse connection is coming soon. For now, export costs to CSV or use the
        local MCP agent.
      </p>
    ),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Connect">
        Pick a tool below to connect — GitHub for wins, AI vendors for spend.
        {params.github_app === "connected" && params.login ? (
          <span className="mt-2 block theme-accent">
            GitHub App installed for {params.login}
            {params.repos ? ` — ${params.repos} repos with webhooks live` : ""}.
          </span>
        ) : params.github === "connected" && params.login ? (
          <span className="mt-2 block theme-accent">
            GitHub connected as {params.login}. Pick repos below.
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

      <IntegrationConnectHub integrations={integrations} panels={panels} />

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm theme-text-muted">
          After connecting, run sync to pull spend and GitHub wins into Overview.
        </p>
        <SyncAllButton />
      </div>
    </div>
  );
}
