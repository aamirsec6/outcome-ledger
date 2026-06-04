import type { Overview } from "@/lib/mock-metrics";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
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
      headers: outcomeLedgerHeaders(),
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

export async function fetchOrgProfile(): Promise<OrgProfile> {
  if (!API_URL) {
    return { companyName: "Your organization" };
  }
  try {
    const res = await fetch(`${API_URL}/v1/settings/org-profile`, {
      headers: outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return { companyName: "Your organization" };
    const data = await res.json();
    return data.profile ?? { companyName: "Your organization" };
  } catch {
    return { companyName: "Your organization" };
  }
}

export async function fetchTeamMappings(): Promise<{ pattern: string; teamId: string }[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/v1/settings/team-mappings`, {
      headers: outcomeLedgerHeaders(),
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
      headers: outcomeLedgerHeaders(),
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
        headers: outcomeLedgerHeaders(),
        cache: "no-store",
      }),
      fetch(`${API_URL}/v1/metrics/cpst-history`, {
        headers: outcomeLedgerHeaders(),
        cache: "no-store",
      }),
      fetch(`${API_URL}/v1/contracts/versions`, {
        headers: outcomeLedgerHeaders(),
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
      headers: outcomeLedgerHeaders(),
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

export async function fetchAttribution(): Promise<AttributionBreakdown | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/v1/metrics/attribution`, {
      headers: outcomeLedgerHeaders(),
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
    return { ...getMockOverview(), dataSource: "mock" };
  }
  try {
    const res = await fetch(`${API_URL}/v1/metrics/overview`, {
      headers: outcomeLedgerHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.warn("Outcome Ledger API error", res.status);
      return { ...getMockOverview(), dataSource: "mock-fallback" };
    }
    const data = await res.json();
    return { ...data, dataSource: data.dataSource || "live" };
  } catch (e) {
    console.warn("Outcome Ledger API unreachable", e);
    return { ...getMockOverview(), dataSource: "mock-fallback" };
  }
}
