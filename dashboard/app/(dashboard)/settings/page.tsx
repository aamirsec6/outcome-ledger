import { OrgProfilePanel } from "@/components/org-profile-panel";
import { PageHeader } from "@/components/page-header";
import { ThemeSettings } from "@/components/theme-settings";
import { TeamMappingsPanel } from "@/components/team-mappings";
import { WinDefinitionPanel } from "@/components/win-definition-panel";
import { AgentApiKeyCard } from "@/components/agent-api-key-card";
import { SyncAllButton } from "@/components/sync-all-button";
import {
  fetchOrgProfile,
  fetchOutcomeWinSettings,
  fetchTeamMappings,
  hasLiveApi,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const live = hasLiveApi();
  const [mappings, winSettings, orgProfile] = live
    ? await Promise.all([
        fetchTeamMappings(),
        fetchOutcomeWinSettings(),
        fetchOrgProfile(),
      ])
    : [
        [],
        { winType: "pr_merged_stable", stableDays: 7, summary: "", options: [] },
        { companyName: "Your organization" },
      ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings">
        Appearance · define a win · team attribution · CPST v1.0 · scheduled sync
      </PageHeader>
      <ThemeSettings />
      <AgentApiKeyCard />
      <OrgProfilePanel initial={orgProfile} />
      <WinDefinitionPanel initial={winSettings} />
      <SyncAllButton />
      <TeamMappingsPanel initialMappings={mappings} />
      <section className="theme-panel p-4 text-sm theme-text-muted">
        <p className="theme-heading font-medium">Cron (Railway)</p>
        <p className="mt-2">
          POST <code className="theme-code">/v1/cron/sync</code> daily with header{" "}
          <code className="theme-code">X-Cron-Secret</code>. Set{" "}
          <code className="theme-code">OUTCOME_STABLE_DAYS=7</code> for production (0 = pilot).
        </p>
      </section>
    </div>
  );
}
