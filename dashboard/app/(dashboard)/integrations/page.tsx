import { CheckCircle2, Circle, Upload } from "lucide-react";
import { AgentSetupCard } from "@/components/agent-setup-card";
import { ConnectWizard } from "@/components/connect-wizard";
import { CursorConnectPanel } from "@/components/cursor-connect";
import { GitHubConnectPanel } from "@/components/github-connect";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SpendCsvUpload } from "@/components/spend-csv-upload";
import { SyncAllButton } from "@/components/sync-all-button";
import { fetchOverview, fetchTeamMappings } from "@/lib/api";
import {
  connectGithubUrl,
  fetchAvailableRepos,
  fetchGithubStatus,
  installGithubAppUrl,
} from "@/lib/github-api";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const statusLabel = {
  connected: "Connected",
  csv: "CSV uploaded",
  pending: "Not connected",
} as const;

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

  const others = integrations.filter((i) => i.id !== "github");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Connect">
        Link GitHub and your AI tools, then sync to see spend and wins.
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

      <GitHubConnectPanel
        connectUrl={connectGithubUrl()}
        installAppUrl={installGithubAppUrl()}
        status={githubStatus}
        availableRepos={available.repos || []}
      />

      <SectionCard
        title="AI spend"
        description="Connect billing APIs or upload a CSV if auto-sync isn't available."
      >
        <ul className="space-y-2">
          {others.map((i) => (
            <li
              key={i.id}
              className="theme-inset flex items-center justify-between rounded-lg px-4 py-3"
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

        <div className="space-y-4 border-t border-[var(--border)] pt-4">
          <CursorConnectPanel
            configured={
              others.find((i) => i.id === "cursor")?.status === "connected"
            }
          />
          <SpendCsvUpload
            source="openai"
            label="OpenAI"
            hint="Upload a billing CSV with date and amount columns."
          />
          <SpendCsvUpload
            source="cursor"
            label="Cursor"
            hint="Export from Billing & Invoices, then upload here."
          />
          <SpendCsvUpload
            source="claude-code"
            label="Claude Code"
            hint="Upload a usage or billing CSV with date and cost."
          />
        </div>
      </SectionCard>

      <SyncAllButton />

      <AgentSetupCard />
    </div>
  );
}
