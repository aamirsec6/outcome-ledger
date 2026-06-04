"use client";

import { ArrowRight } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import { HeroDashboardBanner } from "@/components/marketing/hero-dashboard-banner";

export function HeroResend() {
  return (
    <section className="relative px-4 pb-8 pt-28 md:pb-12 md:pt-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="animate-fade-up text-center lg:text-left">
          <h1 className="text-[2.75rem] font-medium leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[3.5rem]">
            CPST for
            <br />
            developers
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-muted)] lg:mx-0">
            The best way to reach finance with proof, not token charts. Deliver
            deterministic cost-per-outcome metrics at scale.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#get-started"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </a>
            <DashboardLink className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg-elevated)]">
              View dashboard
            </DashboardLink>
          </div>
        </div>
        <div className="animate-fade-up lg:pl-4" style={{ animationDelay: "0.12s" }}>
          <HeroDashboardBanner />
        </div>
      </div>
    </section>
  );
}
