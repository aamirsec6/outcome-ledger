import { USE_CASES } from "@/lib/marketing-content";

export function QuotesSection() {
  return (
    <section
      id="use-cases"
      className="scroll-mt-28 border-t border-[var(--border)] px-4 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-medium tracking-tight text-white md:text-3xl">
          Beyond expectations
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[var(--text-muted)]">
          Teams use Outcome Ledger when finance asks for ROI and token dashboards
          are not enough.
        </p>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {USE_CASES.map((u) => (
            <blockquote
              key={u.n}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-left"
            >
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                &ldquo;{u.description}&rdquo;
              </p>
              <footer className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="text-sm font-medium text-white">{u.title}</p>
                <p className="mt-0.5 text-xs text-[var(--text-dim)]">{u.headline}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
