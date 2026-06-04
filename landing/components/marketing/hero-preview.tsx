"use client";

import { TrendingDown } from "lucide-react";

export function HeroPreview() {
  return (
    <div className="animate-float relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
        style={{ background: "var(--accent-glow)" }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono-label text-[10px] uppercase tracking-widest text-zinc-500">
              Live sync
            </span>
          </div>
          <span className="font-mono-label text-[10px] text-zinc-600">CPST v1.0</span>
        </div>

        <div className="p-5 md:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Org CPST · 90 days
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              $4,280
            </span>
            <span className="mb-1 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <TrendingDown className="h-3 w-3" />
              18%
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">per stable merged outcome</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MetricPill label="Stable outcomes" value="47" />
            <MetricPill label="AI spend" value="$201k" />
            <MetricPill label="Attributed" value="82%" accent />
            <MetricPill label="Failure share" value="14%" warn />
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Attribution coverage</span>
              <span>82%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: "82%" }}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {["Platform", "Payments", "Infra"].map((team, i) => (
              <div
                key={team}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-2"
              >
                <p className="truncate text-[10px] text-zinc-500">{team}</p>
                <p className="font-mono-label text-xs font-medium text-zinc-300">
                  ${(4.8 - i * 0.9).toFixed(1)}k
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 font-mono-label text-sm font-semibold ${
          accent ? "text-emerald-400" : warn ? "text-amber-400/90" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
