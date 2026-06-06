import { ArrowRight, Banknote, Layers3, Trophy } from "lucide-react";
import { LuxeIcon } from "@/components/marketing/luxe-icon";
import { PageContainer } from "@/components/marketing/page-container";

const TOP_ITEMS = ["OpenAI and Anthropic bills", "Cursor and Claude Code", "Agent runs and retries"];
const BOTTOM_ITEMS = [
  "Bug fixes that stayed shipped",
  "Features customers actually use",
  "Work that did not get rolled back",
];

export function ValueLayerSection() {
  return (
    <section
      id="the-layer"
      className="scroll-mt-28 border-t border-[var(--border)] py-20 md:py-28"
    >
      <PageContainer>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-500/90">
              The missing piece
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              AI tools show what you spend.
              <span className="block text-[var(--text-muted)]">
                We show what each win cost.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-muted)] lg:text-lg">
              Companies track tokens, licenses, and percent of code from AI. Leadership
              still asks one question:{" "}
              <em className="text-zinc-300">what got better for customers, and was it worth it?</em>{" "}
              Outcome Ledger sits in the middle and answers that in one number.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:p-8">
            <p className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
              The number leaders want
            </p>
            <p className="mt-3 font-mono-label text-3xl font-medium tabular-nums text-emerald-300 md:text-4xl">
              Cost per win = Spend ÷ Real wins
            </p>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Also called CPST (cost per successful task). Fully loaded spend divided by outcomes
              that stuck.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-5 xl:grid-cols-[1fr_auto_1.35fr_auto_1fr] xl:items-stretch xl:gap-6">
          {/* Spend */}
          <article className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:p-8">
            <LuxeIcon icon={Banknote} accent="cyan" size="lg" />
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
              What you pay for
            </p>
            <p className="mt-2 text-xl font-medium text-white">AI bills and coding tools</p>
            <ul className="mt-5 flex flex-col gap-2">
              {TOP_ITEMS.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-zinc-400"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-6 text-sm text-[var(--text-dim)]">
              Typical report: &ldquo;We spent{" "}
              <span className="text-zinc-300">$1.2M</span> on AI this quarter.&rdquo;
            </p>
          </article>

          <div className="hidden items-center justify-center xl:flex">
            <div className="flex flex-col items-center gap-2 text-[var(--text-dim)]">
              <span className="text-[10px] uppercase tracking-wider">no link today</span>
              <ArrowRight className="h-6 w-6 rotate-0" aria-hidden />
            </div>
          </div>

          {/* Outcome Ledger */}
          <article
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/45 p-6 shadow-[0_0_80px_-16px_var(--accent-glow)] lg:p-8 xl:row-span-1"
            style={{
              background:
                "linear-gradient(145deg, rgba(52,211,153,0.12) 0%, var(--bg-card) 42%, #0a0f0d 100%)",
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
            <div className="flex flex-wrap items-start gap-4">
              <LuxeIcon icon={Layers3} accent="emerald" size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                  Outcome Ledger
                </p>
                <p className="mt-1 text-xl font-medium text-white lg:text-2xl">
                  The value layer in between
                </p>
              </div>
            </div>
            <p className="mt-6 text-base leading-relaxed text-[var(--text-muted)]">
              Pulls in your AI spend and your shipped work. Links them automatically. Reports{" "}
              <strong className="font-medium text-white">cost per win</strong> so finance and
              engineering share the same story.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/25 bg-black/35 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Input</p>
                <p className="mt-1 text-sm text-white">Vendor bills + GitHub wins</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-black/35 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Output</p>
                <p className="mt-1 text-sm text-white">Cost per win by team</p>
              </div>
            </div>
            <p className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100/90">
              Example: &ldquo;That checkout fix cost{" "}
              <span className="font-medium text-white">$340</span> and stayed shipped.&rdquo;
            </p>
          </article>

          <div className="hidden items-center justify-center xl:flex">
            <ArrowRight className="h-6 w-6 text-emerald-500/80" aria-hidden />
          </div>

          {/* Wins */}
          <article className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:p-8">
            <LuxeIcon icon={Trophy} accent="amber" size="lg" />
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[var(--text-dim)]">
              What got better
            </p>
            <p className="mt-2 text-xl font-medium text-white">Real wins customers feel</p>
            <ul className="mt-5 flex flex-col gap-2">
              {BOTTOM_ITEMS.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-zinc-400"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-6 text-sm text-[var(--text-dim)]">
              Typical report: &ldquo;We shipped{" "}
              <span className="text-zinc-300">47 wins</span> that did not get rolled back.&rdquo;
            </p>
          </article>
        </div>

        <p className="mt-12 max-w-3xl text-sm leading-relaxed text-[var(--text-dim)] lg:text-base">
          Observability tools like Langfuse watch individual AI calls. Finance tools watch invoices.
          Outcome Ledger is the layer between them:{" "}
          <span className="text-[var(--text-muted)]">spend tied to accepted outcomes.</span>
        </p>
      </PageContainer>
    </section>
  );
}
