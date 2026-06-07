async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export type FunnelStep = {
  step: string;
  count: number;
  pct: number;
  dropoffPct: number;
};

export type RetentionBuckets = {
  active: number;
  at_risk: number;
  dormant: number;
  churned: number;
  new: number;
};

export type OrgHealth = {
  orgId: string;
  orgName: string;
  onboardingStep: string;
  onboardingCompleted: boolean;
  firstCpstAt: string | null;
  lastSyncAt: string | null;
  lastDashboardViewAt: string | null;
  syncCount30d: number;
  dashboardViews30d: number;
  retentionBucket: string;
  healthScore: number;
  updatedAt: string | null;
};

export type OrgDetail = {
  orgId: string;
  orgName: string;
  createdAt: string | null;
  health: {
    onboardingStep: string;
    onboardingCompleted: boolean;
    firstCpstAt: string | null;
    lastSyncAt: string | null;
    syncCount30d: number;
    dashboardViews30d: number;
    retentionBucket: string;
    healthScore: number;
  };
  events: {
    step: string;
    metadata: Record<string, unknown> | null;
    createdAt: string | null;
  }[];
};

// ── API calls (via server proxy — token stays server-side) ─────────────────

export async function fetchFunnel(): Promise<FunnelStep[]> {
  const data = await apiGet<{ funnel: FunnelStep[] }>("funnel");
  return data.funnel;
}

export async function fetchRetention(): Promise<RetentionBuckets> {
  const data = await apiGet<{ buckets: RetentionBuckets }>("retention");
  return data.buckets;
}

export async function fetchOrgs(params?: {
  bucket?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orgs: OrgHealth[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.bucket) q.set("bucket", params.bucket);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString() ? `?${q.toString()}` : "";
  return apiGet(`orgs${qs}`);
}

export async function fetchOrgDetail(orgId: string): Promise<OrgDetail> {
  return apiGet(`orgs/${encodeURIComponent(orgId)}`);
}
