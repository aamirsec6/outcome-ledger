"use client";

import Link from "next/link";
import type { OrgHealth } from "@/lib/api";

const BUCKET_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Active" },
  at_risk: { bg: "bg-amber-500/10", text: "text-amber-400", label: "At risk" },
  dormant: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Dormant" },
  churned: { bg: "bg-red-500/10", text: "text-red-400", label: "Churned" },
  new: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "New" },
};

const STEP_LABELS: Record<string, string> = {
  signup: "Signed up",
  connect_github: "GitHub connected",
  connect_vendor: "Vendor connected",
  define_outcome: "Outcome defined",
  first_sync: "First sync done",
  first_dashboard: "Viewed dashboard",
  first_export: "Exported report",
};

export function OrgTable({
  orgs,
  total,
  bucketFilter,
  onBucketChange,
}: {
  orgs: OrgHealth[];
  total: number;
  bucketFilter: string | null;
  onBucketChange: (bucket: string | null) => void;
}) {
  const buckets = ["active", "at_risk", "dormant", "churned", "new"];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-sm font-medium text-white">Organizations</h2>
          <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
            {total} total · Sorted by health score
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onBucketChange(null)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${
              !bucketFilter
                ? "bg-white/10 text-white"
                : "text-[var(--text-dim)] hover:text-[var(--text-muted)]"
            }`}
          >
            All
          </button>
          {buckets.map((b) => {
            const cfg = BUCKET_BADGES[b];
            return (
              <button
                key={b}
                onClick={() => onBucketChange(bucketFilter === b ? null : b)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${
                  bucketFilter === b ? `${cfg.bg} ${cfg.text}` : "text-[var(--text-dim)] hover:text-[var(--text-muted)]"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-dim)]">
              <th className="px-5 py-3 font-medium">Org</th>
              <th className="px-3 py-3 font-medium">Health</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Step</th>
              <th className="px-3 py-3 font-medium">Last sync</th>
              <th className="px-3 py-3 font-medium">Syncs (30d)</th>
              <th className="px-3 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-dim)]">
                  No organizations found
                </td>
              </tr>
            ) : (
              orgs.map((org) => {
                const badge = BUCKET_BADGES[org.retentionBucket] || BUCKET_BADGES.new;
                return (
                  <tr
                    key={org.orgId}
                    className="border-b border-[var(--border)]/50 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-white">{org.orgName}</p>
                        <p className="text-[9px] text-[var(--text-dim)]">{org.orgId.slice(0, 8)}…</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                          <div
                            className={`h-full rounded-full ${
                              org.healthScore >= 60
                                ? "bg-emerald-500"
                                : org.healthScore >= 30
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${org.healthScore}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-white">{org.healthScore}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">
                      {STEP_LABELS[org.onboardingStep] || org.onboardingStep}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">
                      {org.lastSyncAt
                        ? new Date(org.lastSyncAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-white">{org.syncCount30d}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/org/${org.orgId}`}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
