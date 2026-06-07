"use client";

import type { FunnelStep } from "@/lib/api";

const STEP_LABELS: Record<string, string> = {
  signup: "Sign up",
  connect_github: "Connect GitHub",
  connect_vendor: "Connect AI vendor",
  define_outcome: "Define outcome",
  first_sync: "First sync",
  first_dashboard: "View dashboard",
  first_export: "Export report",
};

const COLORS = [
  "bg-emerald-500",
  "bg-emerald-400",
  "bg-cyan-400",
  "bg-cyan-300",
  "bg-amber-400",
  "bg-amber-300",
  "bg-violet-400",
];

export function FunnelChart({ data }: { data: FunnelStep[] }) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-sm font-medium text-white">Onboarding funnel</h2>
        <p className="mt-2 text-xs text-[var(--text-muted)]">No data yet</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Onboarding funnel</h2>
          <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
            {data[0]?.count || 0} total signups ·{" "}
            {data[data.length - 1]?.pct || 0}% complete full flow
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((step, i) => {
          const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
          return (
            <div key={step.step} className="group">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${COLORS[i] || "bg-zinc-500"}`}
                  />
                  {STEP_LABELS[step.step] || step.step}
                </span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-white">{step.count}</span>
                  <span className="tabular-nums text-[var(--text-dim)]">{step.pct}%</span>
                  {step.dropoffPct > 0 && i > 0 && (
                    <span className="tabular-nums text-red-400/70">
                      -{step.dropoffPct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className={`h-full rounded-full ${COLORS[i] || "bg-zinc-500"} transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dropoff callout */}
      {data.length > 1 && (
        <div className="mt-4 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300/80">
          💡 Biggest dropoff:{" "}
          {(() => {
            let maxDrop = 0;
            let maxStep = "";
            for (let i = 1; i < data.length; i++) {
              if (data[i].dropoffPct > maxDrop) {
                maxDrop = data[i].dropoffPct;
                maxStep = STEP_LABELS[data[i].step] || data[i].step;
              }
            }
            return maxStep ? `${maxStep} (-${maxDrop}%)` : "N/A";
          })()}
        </div>
      )}
    </div>
  );
}
