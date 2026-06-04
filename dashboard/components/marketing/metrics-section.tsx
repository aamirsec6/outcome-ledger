import { PERF_METRICS } from "@/lib/marketing-content";
import { SectionLabel } from "./section-label";

export function MetricsSection() {
  return (
    <section id="metrics" className="scroll-mt-24 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionLabel code="Performance" />
        <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          Production metrics that matter
        </h2>

        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PERF_METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center md:p-8"
            >
              <p className="text-4xl font-bold text-teal-400 md:text-5xl">{m.value}</p>
              <p className="mt-2 text-sm font-medium text-white">{m.label}</p>
              <p className="mt-1 text-xs text-slate-500">{m.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
