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
              AI costs are rising.
              <span className="mt-1 block text-[var(--text-muted)]">
                Prove what each win cost.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--text-muted)] xl:max-w-2xl xl:text-xl">
              Outcome Ledger connects your AI bills to work that actually shipped. You get{" "}
              <strong className="font-medium text-zinc-200">cost per win</strong> in plain numbers
              your whole leadership team can trust.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href="#get-started"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </a>
              <DashboardLink className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)]">
                View dashboard
              </DashboardLink>
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
