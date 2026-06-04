"use client";

import { ArrowRight } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";

export function HeroResend() {
  return (
    <section className="relative px-4 pb-8 pt-28 md:pb-12 md:pt-32">
      <div className="mx-auto max-w-4xl text-center animate-fade-up">
        <h1 className="text-[2.75rem] font-medium leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
          CPST for
          <br />
          developers
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-muted)] md:text-xl">
          The best way to reach finance with proof, not token charts. Deliver
          deterministic cost-per-outcome metrics at scale.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
    </section>
  );
}
