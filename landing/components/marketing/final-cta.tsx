import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="border-t border-[var(--border)] px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
          CPST reimagined.
          <br />
          Available today.
        </h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="mailto:hello@outcomeledger.com"
            className="inline-flex items-center rounded-lg border border-[var(--border-strong)] px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)]"
          >
            Contact us
          </a>
        </div>
      </div>
    </section>
  );
}
