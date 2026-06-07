import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/marketing/page-container";

export function FinalCta() {
  return (
    <section className="border-t border-[var(--border)] py-24 md:py-32">
      <PageContainer className="text-center">
        <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
          Your next board meeting is coming.
          <br />
          <span className="text-emerald-400">Be ready with the number.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[var(--text-muted)] lg:text-lg">
          Connect your AI bills and GitHub. See cost per win in under a day.
          Free for teams under 50 engineers.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--text-dim)]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            No credit card
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Live in under a day
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Free for small teams
          </span>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            See your cost per win
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="mailto:hello@outcomeledger.com"
            className="inline-flex items-center rounded-lg border border-[var(--border-strong)] px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)]"
          >
            Talk to us
          </a>
        </div>
      </PageContainer>
    </section>
  );
}
