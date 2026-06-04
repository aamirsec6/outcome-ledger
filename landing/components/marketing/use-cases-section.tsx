import { USE_CASES } from "@/lib/marketing-content";
import { SectionLabel } from "./section-label";

export function UseCasesSection() {
  return (
    <section
      id="use-cases"
      className="scroll-mt-28 border-t border-[var(--border)] px-4 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <SectionLabel code="Buyers" />
        <h2 className="font-display mt-4 text-3xl font-semibold text-white md:text-4xl">
          Built for the people asking hard questions
        </h2>

        <div className="mt-14 space-y-4">
          {USE_CASES.map((uc) => (
            <article
              key={uc.n}
              className="group grid gap-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition hover:border-[var(--border-strong)] md:grid-cols-[4rem_1fr] md:items-start md:p-8"
            >
              <span className="font-display text-5xl font-semibold text-zinc-800 transition group-hover:text-zinc-700">
                {uc.n}
              </span>
              <div>
                <p className="font-mono-label text-[11px] uppercase tracking-wider text-emerald-500/80">
                  {uc.title}
                </p>
                <h3 className="font-display mt-2 text-xl font-semibold text-white">
                  {uc.headline}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
                  {uc.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {uc.bullets.map((b) => (
                    <span
                      key={b}
                      className="text-xs text-zinc-500 before:mr-2 before:text-emerald-600 before:content-['→']"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
