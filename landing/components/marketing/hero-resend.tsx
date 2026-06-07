"use client";

import { ArrowRight } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import { HeroDashboardBanner } from "@/components/marketing/hero-dashboard-banner";
import { PageContainer } from "@/components/marketing/page-container";

export function HeroResend() {
  return (
    <section className="relative pb-10 pt-28 md:pb-16 md:pt-32">
      <PageContainer>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)] lg:gap-10 xl:gap-14">
          <div className="animate-fade-up max-w-2xl lg:max-w-none">
            <p className="mb-5 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
              The value layer between AI spend and real wins
            </p>
            <h1 className="text-[2.85rem] font-medium leading-[1.05] tracking-tight text-white sm:text-6xl xl:text-[4.25rem]">
              Your AI bills show
              <span className="mt-1 block text-[var(--text-muted)]">
                what you spent.
              </span>
              <span className="mt-1 block">
                We show what each
                <span className="text-emerald-400"> win cost.</span>
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--text-muted)] xl:max-w-2xl xl:text-xl">
              Connect OpenAI, Anthropic, and Cursor to GitHub. Outcome Ledger calculates{" "}
              <strong className="font-medium text-zinc-200">cost per win</strong> — the one number
              your CFO, CTO, and board actually need.
            </p>

            {/* Before → After mini proof */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-red-400/80">Before</p>
                <p className="mt-1 text-sm text-zinc-400">
                  &ldquo;We spent <span className="font-medium text-white">$201k</span> on AI this quarter. Token usage up 340%.&rdquo;
                </p>
                <p className="mt-2 text-[10px] text-zinc-600">(Finance: &ldquo;So what?&rdquo;)</p>
              </div>
              <div className="hidden text-center text-zinc-600 sm:block">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">After</p>
                <p className="mt-1 text-sm text-zinc-400">
                  &ldquo;<span className="font-medium text-white">209 wins</span> shipped. <span className="font-medium text-emerald-400">$962</span> each. Down 12% vs last month.&rdquo;
                </p>
                <p className="mt-2 text-[10px] text-zinc-600">(Board: approved.)</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#get-started"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                See your cost per win
                <ArrowRight className="h-4 w-4" />
              </a>
              <DashboardLink className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)]">
                View live dashboard
              </DashboardLink>
            </div>

            {/* Trust row */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-dim)]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Free for teams &lt; 50 engineers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live in under a day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                No code changes needed
              </span>
            </div>
          </div>
          <div
            className="animate-fade-up w-full min-w-0 lg:-mr-4 xl:-mr-8"
            style={{ animationDelay: "0.12s" }}
          >
            <HeroDashboardBanner />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
