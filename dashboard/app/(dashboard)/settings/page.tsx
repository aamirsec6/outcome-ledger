import { NotificationSettingsPanel } from "@/components/notification-settings-panel";
import { OrgProfilePanel } from "@/components/org-profile-panel";
import { PageHeader } from "@/components/page-header";
import { ThemeSettings } from "@/components/theme-settings";
import { TeamMappingsPanel } from "@/components/team-mappings";
import { WinDefinitionPanel } from "@/components/win-definition-panel";
import { AgentApiKeyCard } from "@/components/agent-api-key-card";
import { SyncAllButton } from "@/components/sync-all-button";
import {
  fetchNotificationSettings,
  fetchOrgProfile,
  fetchOutcomeWinSettings,
  fetchTeamMappings,
  fetchWorkspaceApiKeyMeta,
  hasLiveApi,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const live = hasLiveApi();
  const [mappings, winSettings, orgProfile, apiKeyMeta, notifSettings] = live
    ? await Promise.all([
        fetchTeamMappings(),
        fetchOutcomeWinSettings(),
        fetchOrgProfile(),
        fetchWorkspaceApiKeyMeta(),
        fetchNotificationSettings(),
      ])
    : [
        [],
        { winType: "pr_merged_stable", stableDays: 7, summary: "", options: [] },
        { companyName: "Your organization" },
        { primaryKeyPrefix: null, primaryKeyName: null, error: null },
        {
          slackWebhookUrl: "",
          slackAlertsEnabled: false,
          digestEmails: [],
          digestEnabled: false,
          monthlyBudgetUsd: 0,
          budgetAlertThresholdPct: 80,
          githubPrCommentsEnabled: false,
          alertOnCpstSpike: true,
          alertOnBudgetBurn: true,
          alertOnInbox: true,
        },
      ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings">
        Profile, win rules, team tags, and optional sync key
      </PageHeader>
      <ThemeSettings />
      <AgentApiKeyCard
        initialPrefix={apiKeyMeta.primaryKeyPrefix}
        initialName={apiKeyMeta.primaryKeyName}
        initialError={apiKeyMeta.error}
      />
      <NotificationSettingsPanel initial={notifSettings} />
      <OrgProfilePanel initial={orgProfile} />
      <WinDefinitionPanel initial={winSettings} />
      <TeamMappingsPanel initialMappings={mappings} />
      <SyncAllButton />
    </div>
  );
}
