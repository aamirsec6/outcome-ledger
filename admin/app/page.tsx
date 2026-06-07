"use client";

import { useEffect, useState } from "react";
import { FunnelChart } from "./components/funnel-chart";
import { RetentionBar } from "./components/retention-bar";
import { OrgTable } from "./components/org-table";
import { fetchFunnel, fetchRetention, fetchOrgs, runAnalyticsBackfill } from "@/lib/api";
import type { FunnelStep, RetentionBuckets, OrgHealth } from "@/lib/api";

export default function AdminPage() {
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [retention, setRetention] = useState<RetentionBuckets | null>(null);
  const [orgs, setOrgs] = useState<OrgHealth[]>([]);
  const [totalOrgs, setTotalOrgs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucketFilter, setBucketFilter] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    loadData();
  }, [bucketFilter]);

  async function loadData(options?: { allowAutoBackfill?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const [funnelData, retentionData, orgsData] = await Promise.all([
        fetchFunnel(),
        fetchRetention(),
        fetchOrgs({ bucket: bucketFilter || undefined, limit: 50 }),
      ]);

      const needsBackfill =
        options?.allowAutoBackfill !== false &&
        orgsData.total > 0 &&
        orgsData.orgs.length === 0;

      if (needsBackfill) {
        setBackfilling(true);
        try {
          await runAnalyticsBackfill();
          return loadData({ allowAutoBackfill: false });
        } finally {
          setBackfilling(false);
        }
      }

      setFunnel(funnelData);
      setRetention(retentionData);
      setOrgs(orgsData.orgs);
      setTotalOrgs(orgsData.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-[var(--text-muted)]">
          {backfilling ? "Backfilling analytics from existing data…" : "Loading analytics…"}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-400">Failed to load admin data</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg-elevated)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <span className="text-sm font-bold text-emerald-400">OL</span>
            </div>
            <div>
              <h1 className="text-sm font-medium text-white">Outcome Ledger Admin</h1>
              <p className="text-[10px] text-[var(--text-dim)]">Analytics · Funnel · Retention</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
              {totalOrgs} orgs
            </span>
            <button
              onClick={async () => {
                setBackfilling(true);
                try {
                  await runAnalyticsBackfill();
                  await loadData({ allowAutoBackfill: false });
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Backfill failed");
                } finally {
                  setBackfilling(false);
                }
              }}
              disabled={backfilling}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
            >
              {backfilling ? "Backfilling…" : "Backfill data"}
            </button>
            <button
              onClick={() => loadData()}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Total orgs"
            value={String(totalOrgs)}
            sub="Registered workspaces"
          />
          <SummaryCard
            label="Active (30d)"
            value={String(retention?.active || 0)}
            sub="Ran sync in last 30 days"
            accent
          />
          <SummaryCard
            label="At risk"
            value={String(retention?.at_risk || 0)}
            sub="No sync in 30-60 days"
            warning
          />
          <SummaryCard
            label="Churned"
            value={String(retention?.churned || 0)}
            sub="No sync in 60+ days"
            danger
          />
        </div>

        {/* Funnel + Retention */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <FunnelChart data={funnel} />
          <RetentionBar data={retention} />
        </div>

        {/* Org table */}
        <OrgTable
          orgs={orgs}
          total={totalOrgs}
          bucketFilter={bucketFilter}
          onBucketChange={setBucketFilter}
        />
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
  warning,
  danger,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  const color = accent
    ? "text-emerald-400"
    : warning
      ? "text-amber-400"
      : danger
        ? "text-red-400"
        : "text-white";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-[10px] text-[var(--text-dim)]">{sub}</p>
    </div>
  );
}
