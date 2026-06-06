import type { Overview } from "@/lib/mock-metrics";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { emptyOverview } from "@/lib/empty-overview";
import { isClerkEnabled } from "@/lib/clerk-config";
import { getMockOverview } from "@/lib/mock-metrics";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export function hasLiveApi(): boolean {
  return Boolean(API_URL);
}

export type OutcomeWinSettings = {
  winType: string;
  stableDays: number;
  summary: string;
  options: { id: string; label: string; description: string }[];
  contract?: { version?: string; cfoApproved?: boolean } | null;
};

export async function fetchOutcomeWinSettings(): Promise<OutcomeWinSettings> {
  if (!API_URL) {
    return {
      winType: "pr_merged_stable",
      stableDays: 7,
      summary: "",
      options: [],
      contract: null,
    };
  }
  try {
    const res = await fetch(`${API_URL}/v1/settings/outcome-win`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        winType: "pr_merged_stable",
        stableDays: 7,
        summary: "",
        options: [],
      };
    }
    return res.json();
  } catch {
    return {
      winType: "pr_merged_stable",
      stableDays: 7,
      summary: "",
      options: [],
    };
  }
}

export type OrgProfile = {
  companyName: string;
  legalName?: string;
  tagline?: string;
  stage?: string;
  industry?: string;
  website?: string;
  headquarters?: string;
};

export type NotificationSettings = {
  slackWebhookUrl: string;
  slackAlertsEnabled: boolean;
  digestEmails: string[];
  digestEnabled: boolean;
  monthlyBudgetUsd: number;
  budgetAlertThresholdPct: number;
  githubPrCommentsEnabled: boolean;
  alertOnCpstSpike: boolean;
  alertOnBudgetBurn: boolean;
  alertOnInbox: boolean;
};

const defaultNotificationSettings: NotificationSettings = {
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
};

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  if (!API_URL) return defaultNotificationSettings;
  try {
    const res = await fetch(`${API_URL}/v1/settings/notifications`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return defaultNotificationSettings;
    const data = await res.json();
    return { ...defaultNotificationSettings, ...(data.settings ?? {}) };
  } catch {
    return defaultNotificationSettings;
  }
}

export async function fetchOrgProfile(): Promise<OrgProfile> {
  if (!API_URL) {
    return { companyName: "Your organization" };
  }
  try {
    const res = await fetch(`${API_URL}/v1/settings/org-profile`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return { companyName: "Your organization" };
    const data = await res.json();
    return data.profile ?? { companyName: "Your organization" };
  } catch {
    return { companyName: "Your organization" };
  }
}

export type WorkspaceApiKeyMeta = {
  primaryKeyPrefix: string | null;
  primaryKeyName: string | null;
  error: string | null;
};

export async function fetchWorkspaceApiKeyMeta(): Promise<WorkspaceApiKeyMeta> {
  if (!API_URL) {
    return { primaryKeyPrefix: null, primaryKeyName: null, error: null };
  }
  try {
    const res = await fetch(`${API_URL}/v1/tenants/api-keys`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof data.detail === "string"
          ? data.detail
          : "Could not load API key — try signing out and back in.";
      return { primaryKeyPrefix: null, primaryKeyName: null, error: detail };
    }
    return {
      primaryKeyPrefix: data.primaryKeyPrefix ?? null,
      primaryKeyName: data.primaryKeyName ?? null,
      error: null,
    };
  } catch {
    return {
      primaryKeyPrefix: null,
      primaryKeyName: null,
      error: "Could not reach API — check your connection.",
    };
  }
}

export async function fetchTeamMappings(): Promise<{ pattern: string; teamId: string }[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/v1/settings/team-mappings`, {
      headers: await outcomeLedgerHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.mappings || [];
  } catch {
    return [];
  }
}

export type WinsResponse = {
  winDefinition: string;
  wins: Array<{
    id: string;
    status: string;
    winType: string;
    title: string;
    winSummary: string;
    repo: string;
    prNumber?: number;
    teamId?: string;
    mergedAt?: string;
    githubUrl?: string;
    labels?: string[];
    countsTowardCpst?: boolean;
  }>;
};

export async function fetchWins(): Promise<WinsResponse> {
  if (!API_URL) {
    return { winDefinition: "", wins: [] };
  }
  try {
    const res = await fetch(`${API_URL}/v1/wins`, {
      headers: await outcomeLedgerHeaders(),
      next: { revalidate: 30 },
    });
    if (!res.ok) return { winDefinition: "", wins: [] };
    return res.json();
  } catch {
    return { winDefinition: "", wins: [] };
  }
}

export type ContractMoat = {
  contract: Record<string, unknown> | null;
  history: Array<{
    period: string;
    cpstUsd: number;
    stableOutcomes: number;
    totalSpendUsd: number;
    contractVersion?: string | null;
  }>;
  versions: Array<Record<string, unknown>>;
};

export async function fetchContractMoat(): Promise<ContractMoat> {
  if (!API_URL) {
    return { contract: null, history: [], versions: [] };
  }
  try {
    const [activeRes, historyRes, versionsRes] = await Promise.all([
      fetch(`${API_URL}/v1/contracts/active`, {
        headers: await outcomeLedgerHeaders(),
        cache: "no-store",
      }),
      fetch(`${API_URL}/v1/metrics/cpst-history`, {
        headers: await outcomeLedgerHeaders(),
        cache: "no-store",
      }),
      fetch(`${API_URL}/v1/contracts/versions`, {
        headers: await outcomeLedgerHeaders(),
        cache: "no-store",
      }),
    ]);
    const active = activeRes.ok ? await activeRes.json() : { contract: null };
    const hist = historyRes.ok ? await historyRes.json() : { history: [] };
    const vers = versionsRes.ok ? await versionsRes.json() : { versions: [] };
    return {
      contract: active.contract ?? null,
      history: hist.history ?? [],
      versions: vers.versions ?? [],
    };
  } catch {
    return { contract: null, history: [], versions: [] };
  }
}

export type ExecutiveReport = {
  id: string;
  status: string;
  narrative: string;
  model?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
};

export async function fetchLatestExecutiveReport(): Promise<ExecutiveReport | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/v1/reports/executive/latest`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.report ?? null;
  } catch {
    return null;
  }
}

export type AttributionBreakdown = {
  attributedSpendPct: number;
  unassignedSpendPct: number;
  meetsTarget: boolean;
  targetPct: number;
  unassignedBySource: { source: string; spendUsd: number }[];
  attributedByTeam: { teamId: string; spendUsd: number }[];
  outcomeGraph?: {
    outcomeCount: number;
    linkedSpendUsd: number;
    unlinkedSpendUsd: number;
    outcomeLinkedSpendPct: number;
    avgLinkConfidence: number;
    windowBeforeDays: number;
    windowAfterDays: number;
    sampleLinks: {
      outcomeId: string;
      repo: string;
      teamId: string | null;
      occurredAt: string;
      linkedSpendUsd: number;
      confidence: number;
      method: string;
    }[];
  };
};

export type BenchmarkReport = {
  periodLabel: string;
  verdict: string;
  current: {
    cpstUsd: number;
    linkedSpendPct: number;
    avgLinkConfidence: number;
    linkCount: number;
    engine: string;
  };
  improvements: Record<string, number | string | null | undefined>;
  workflows: {
    workflowType: string;
    linkedSpendUsd: number;
    outcomeCount: number;
    cpstUsd: number;
  }[];
  history: { period: string; cpstUsd: number; linkedSpendPct: number }[];
  anomalies?: {
    week: string;
    cpstUsd: number;
    baselineUsd: number;
    changePct: number;
    severity: string;
    message: string;
  }[];
  network?: {
    available: boolean;
    reason?: string;
    vertical?: string;
    cohortSize?: number;
    cpst?: {
      yourUsd: number;
      p25: number;
      p50: number;
      p75: number;
      yourPercentile: number;
    };
  };
};

export async function fetchBenchmarks(): Promise<BenchmarkReport | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/v1/metrics/benchmarks`, {
      headers: await outcomeLedgerHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAttribution(): Promise<AttributionBreakdown | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/v1/metrics/attribution`, {
      headers: await outcomeLedgerHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchOverview(): Promise<Overview & { dataSource?: string }> {
  if (!API_URL) {
    if (isClerkEnabled()) return emptyOverview();
    return { ...getMockOverview(), dataSource: "mock" };
  }
  try {
    const res = await fetch(`${API_URL}/v1/metrics/overview`, {
      headers: await outcomeLedgerHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.warn("Outcome Ledger API error", res.status);
      if (isClerkEnabled()) {
        return { ...emptyOverview(), dataSource: "setup-required" };
      }
      return { ...getMockOverview(), dataSource: "mock-fallback" };
    }
    const data = await res.json();
    return { ...data, dataSource: data.dataSource || "live" };
  } catch (e) {
    console.warn("Outcome Ledger API unreachable", e);
    if (isClerkEnabled()) {
      return { ...emptyOverview(), dataSource: "setup-required" };
    }
    return { ...getMockOverview(), dataSource: "mock-fallback" };
  }
}
