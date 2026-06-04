import { PERF_METRICS } from "@/lib/marketing-content";
import { SectionLabel } from "./section-label";

export function MetricsSection() {
  return (
    <section id="metrics" className="scroll-mt-28 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel code="Metrics" />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-4">
          {PERF_METRICS.map((m) => (
            <div
              key={m.label}
              className="flex flex-col justify-between bg-[var(--bg-card)] p-8 md:min-h-[200px]"
            >
              <p className="font-display text-5xl font-semibold tracking-tight text-white md:text-6xl">
                {m.value}
              </p>
              <div className="mt-8">
                <p className="text-sm font-medium text-zinc-300">{m.label}</p>
                <p className="mt-1 text-xs text-zinc-600">{m.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
