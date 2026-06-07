"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrgDetail } from "@/lib/api";
import type { OrgDetail } from "@/lib/api";

export default function OrgDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [params.id]);

  async function loadDetail() {
    setLoading(true);
    try {
      const data = await fetchOrgDetail(params.id);
      setDetail(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-[var(--text-muted)]">Loading…</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-red-400">{error || "Not found"}</div>
      </div>
    );
  }

  const h = detail.health;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]">
            ← Back
          </Link>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div>
            <h1 className="text-sm font-medium text-white">{detail.orgName}</h1>
            <p className="text-[10px] text-[var(--text-dim)]">{detail.orgId}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Health score */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
              Health score
            </p>
            <p
              className={`mt-1 text-3xl font-semibold tabular-nums ${
                h.healthScore >= 60
                  ? "text-emerald-400"
                  : h.healthScore >= 30
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {h.healthScore}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className={`h-full rounded-full ${
                  h.healthScore >= 60
                    ? "bg-emerald-500"
                    : h.healthScore >= 30
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${h.healthScore}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
              Status
            </p>
            <p className="mt-1 text-lg font-medium text-white capitalize">{h.retentionBucket}</p>
            <p className="mt-1 text-[10px] text-[var(--text-dim)]">
              {h.onboardingCompleted ? "✅ Onboarding complete" : "⏳ Onboarding in progress"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
              Current step
            </p>
            <p className="mt-1 text-lg font-medium text-white capitalize">
              {h.onboardingStep.replace(/_/g, " ")}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-dim)]">
              {h.firstCpstAt
                ? `First CPST: ${new Date(h.firstCpstAt).toLocaleDateString()}`
                : "No CPST yet"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
              Activity (30d)
            </p>
            <p className="mt-1 text-lg font-medium text-white">{h.syncCount30d} syncs</p>
            <p className="mt-1 text-[10px] text-[var(--text-dim)]">
              {h.lastSyncAt
                ? `Last: ${new Date(h.lastSyncAt).toLocaleDateString()}`
                : "Never synced"}
            </p>
          </div>
        </div>

        {/* Event timeline */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">Onboarding timeline</h2>
          {detail.events.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No events recorded yet</p>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 h-[calc(100%-16px)] w-px bg-[var(--border)]" />

              {detail.events.map((event, i) => (
                <div key={i} className="relative flex gap-4 pb-4 last:pb-0">
                  {/* Dot */}
                  <div className="relative z-10 mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-xs font-medium text-white capitalize">
                      {event.step.replace(/_/g, " ")}
                    </p>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
                        {Object.entries(event.metadata)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                    {event.createdAt && (
                      <p className="mt-0.5 text-[9px] text-[var(--text-dim)]">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
