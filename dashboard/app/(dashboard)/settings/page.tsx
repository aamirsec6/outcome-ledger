import { NotificationSettingsPanel } from "@/components/notification-settings-panel";
import { OrgProfilePanel } from "@/components/org-profile-panel";
import { PageHeader } from "@/components/page-header";
import { SettingsSections } from "@/components/settings-sections";
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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Settings">
        Profile, alerts, team tags, win rules, and sync key
      </PageHeader>

      <SettingsSections
        defaultSection={section}
        general={
          <>
            <ThemeSettings />
            <OrgProfilePanel initial={orgProfile} />
          </>
        }
        notifications={<NotificationSettingsPanel initial={notifSettings} />}
        teams={<TeamMappingsPanel initialMappings={mappings} />}
        wins={<WinDefinitionPanel initial={winSettings} />}
        developer={
          <>
            <AgentApiKeyCard
              initialPrefix={apiKeyMeta.primaryKeyPrefix}
              initialName={apiKeyMeta.primaryKeyName}
              initialError={apiKeyMeta.error}
            />
            <SyncAllButton />
          </>
        }
      />
    </div>
  );
}
