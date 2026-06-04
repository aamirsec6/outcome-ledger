import { USE_CASES } from "@/lib/marketing-content";
import { SectionLabel } from "./section-label";

export function UseCasesSection() {
  return (
    <section id="use-cases" className="scroll-mt-24 border-t border-slate-800/60 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionLabel code="Use cases" />
        <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          Where CPST matters most
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {USE_CASES.map((uc) => (
            <article
              key={uc.n}
              className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 md:p-8"
            >
              <span className="font-mono text-4xl font-bold text-slate-800">
                {uc.n}
              </span>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-teal-500/90">
                {uc.title}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">{uc.headline}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {uc.description}
              </p>
              <ul className="mt-4 space-y-2">
                {uc.bullets.map((b) => (
                  <li key={b} className="text-sm text-slate-500">
                    <span className="text-teal-500/80">→</span> {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
