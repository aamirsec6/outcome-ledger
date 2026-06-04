import { HERO_STATS } from "@/lib/marketing-content";

export function StatsMarquee() {
  const items = [...HERO_STATS, ...HERO_STATS];

  return (
    <div className="border-y border-[var(--border)] bg-[var(--bg-elevated)]/50 py-3">
      <div className="flex animate-marquee gap-10 whitespace-nowrap">
        {items.map((s, i) => (
          <span
            key={`${s.label}-${i}`}
            className="inline-flex shrink-0 items-center gap-3 px-2 text-sm text-zinc-500"
          >
            <span className="font-mono-label font-medium text-zinc-300">{s.label}</span>
            <span>{s.value}</span>
            <span className="text-zinc-700">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
