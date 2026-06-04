import { OrgProfilePanel } from "@/components/org-profile-panel";
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
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Define a win · team attribution · CPST v1.0 · scheduled sync
        </p>
      </header>
      <OrgProfilePanel initial={orgProfile} />
      <WinDefinitionPanel initial={winSettings} />
      <SyncAllButton />
      <TeamMappingsPanel initialMappings={mappings} />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300">Cron (Railway)</p>
        <p className="mt-2">
          POST <code className="text-xs text-teal-300">/v1/cron/sync</code> daily with header{" "}
          <code className="text-xs">X-Cron-Secret</code>. Set{" "}
          <code className="text-xs">OUTCOME_STABLE_DAYS=7</code> for production (0 = pilot).
        </p>
      </div>
    </div>
  );
}
