import { OrgProfilePanel } from "@/components/org-profile-panel";
import { ThemeSettings } from "@/components/theme-settings";
import { TeamMappingsPanel } from "@/components/team-mappings";
import { WinDefinitionPanel } from "@/components/win-definition-panel";
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
      <header>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Settings
        </h1>
        <p className="mt-1 text-sm theme-text-muted">
          Appearance · define a win · team attribution · CPST v1.0 · scheduled sync
        </p>
      </header>
      <ThemeSettings />
      <OrgProfilePanel initial={orgProfile} />
      <WinDefinitionPanel initial={winSettings} />
      <SyncAllButton />
      <TeamMappingsPanel initialMappings={mappings} />
      <div className="theme-panel rounded-xl p-4 text-sm theme-text-muted">
        <p className="font-medium" style={{ color: "var(--text)" }}>
          Cron (Railway)
        </p>
        <p className="mt-2">
          POST <code className="text-xs theme-accent">/v1/cron/sync</code> daily with header{" "}
          <code className="text-xs">X-Cron-Secret</code>. Set{" "}
          <code className="text-xs">OUTCOME_STABLE_DAYS=7</code> for production (0 = pilot).
        </p>
      </div>
    </div>
  );
}
