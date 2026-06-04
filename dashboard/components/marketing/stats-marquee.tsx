"use client";

import { HERO_STATS } from "@/lib/marketing-content";

export function StatsMarquee() {
  const items = [...HERO_STATS, ...HERO_STATS];

  return (
    <div className="relative overflow-hidden border-y border-slate-800/80 bg-slate-950/50 py-4">
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {items.map((s, i) => (
          <div
            key={`${s.label}-${i}`}
            className="inline-flex shrink-0 items-center gap-3 px-2"
          >
            <span className="text-lg font-bold tabular-nums text-teal-400">
              {s.label}
            </span>
            <span className="text-sm text-slate-500">{s.value}</span>
            <span className="text-slate-700">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
