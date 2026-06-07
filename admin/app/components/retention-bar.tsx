"use client";

import type { RetentionBuckets } from "@lib/api";

const BUCKET_CONFIG = [
  { key: "active", label: "Active", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { key: "at_risk", label: "At risk", color: "bg-amber-500", textColor: "text-amber-400" },
  { key: "dormant", label: "Dormant", color: "bg-zinc-500", textColor: "text-zinc-400" },
  { key: "churned", label: "Churned", color: "bg-red-500", textColor: "text-red-400" },
  { key: "new", label: "New", color: "bg-cyan-500", textColor: "text-cyan-400" },
] as const;

export function RetentionBar({ data }: { data: RetentionBuckets | null }) {
  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-sm font-medium text-white">Retention</h2>
        <p className="mt-2 text-xs text-[var(--text-muted)]">No data yet</p>
      </div>
    );
  }

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-white">Retention buckets</h2>
        <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
          {total} total orgs · Based on last sync activity
        </p>
      </div>

      {/* Stacked bar */}
      <div className="mb-4 flex h-6 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        {BUCKET_CONFIG.map((bucket) => {
          const count = (data as Record<string, number>)[bucket.key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={bucket.key}
              className={`${bucket.color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${bucket.label}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUCKET_CONFIG.map((bucket) => {
          const count = (data as Record<string, number>)[bucket.key] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          return (
            <div key={bucket.key} className="flex items-center gap-2 text-[11px]">
              <span className={`inline-block h-2 w-2 rounded-full ${bucket.color}`} />
              <span className="text-[var(--text-muted)]">{bucket.label}</span>
              <span className={`ml-auto tabular-nums ${bucket.textColor}`}>
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
