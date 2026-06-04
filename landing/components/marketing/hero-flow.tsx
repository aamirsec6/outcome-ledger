"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import { HeroPreview } from "./hero-preview";

export function HeroFlow() {
  return (
    <section className="relative px-4 pb-16 pt-24 md:pb-24 md:pt-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="animate-fade-up text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono-label text-[11px] uppercase tracking-wider text-zinc-400">
              Design partners · Q3 2026
            </span>
          </div>

          <h1 className="font-display mt-8 text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
            AI spend is up.
            <br />
            <span className="text-zinc-500">Prove what shipped.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-zinc-400 lg:mx-0">
            Outcome Ledger ties OpenAI, Anthropic, and Cursor to{" "}
            <strong className="font-medium text-zinc-200">stable merged wins</strong> — one
            board-ready{" "}
            <abbr title="Cost per successful outcome" className="text-emerald-400 no-underline">
              CPST
            </abbr>{" "}
            your CFO can sign.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#get-started"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 sm:w-auto"
            >
              Join the waitlist
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
            <DashboardLink className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--border-strong)] px-7 py-3.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-[var(--bg-elevated)] sm:w-auto">
              View dashboard
              <ChevronRight className="h-4 w-4 opacity-60" />
            </DashboardLink>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-[var(--border)] pt-8 lg:justify-start">
            {[
              { n: "6", l: "Product layers" },
              { n: "7d", l: "Stability gate" },
              { n: "100%", l: "Deterministic" },
            ].map((s) => (
              <div key={s.l} className="text-center lg:text-left">
                <p className="font-display text-2xl font-semibold text-white">{s.n}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fade-up lg:pl-4" style={{ animationDelay: "0.15s" }}>
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
