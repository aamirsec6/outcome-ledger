"use client";

import { ArrowRight, BarChart3, Cpu, LineChart } from "lucide-react";
import Link from "next/link";

export function HeroFlow() {
  return (
    <section className="relative px-4 pb-8 pt-28 md:pt-32">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl md:leading-[1.08]">
          Your AI spend is up.
          <br />
          <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            What&apos;s actually shipping?
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl">
          Engineering leaders can&apos;t tie tokens to customer outcomes. Outcome Ledger
          is the value accounting layer —{" "}
          <strong className="font-medium text-slate-200">CPST</strong> and board-ready
          proof before finance kills the budget.
        </p>

        <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-3">
          <FlowNode
            icon={<Cpu className="h-5 w-5 text-amber-400" />}
            label="AI tool spend"
            sub="OpenAI · Anthropic · Cursor"
            variant="source"
          />
          <FlowArrow />
          <FlowNode
            icon={<BarChart3 className="h-5 w-5 text-teal-400" />}
            label="Outcome Ledger"
            sub="Ingest · attribute · CPST"
            variant="core"
          />
          <FlowArrow />
          <FlowNode
            icon={<LineChart className="h-5 w-5 text-indigo-300" />}
            label="Board-ready CPST"
            sub="CFO-signed methodology"
            variant="outcome"
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
          >
            Join design partner waitlist
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900/50"
          >
            Open dashboard
          </Link>
        </div>

        <a
          href="#product"
          className="mt-16 inline-block text-xs uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-400"
        >
          Scroll to explore ↓
        </a>
      </div>
    </section>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1 sm:py-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80">
        <ArrowRight className="h-4 w-4 text-teal-400/90 sm:rotate-0 rotate-90" />
      </div>
    </div>
  );
}

function FlowNode({
  icon,
  label,
  sub,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  variant: "source" | "core" | "outcome";
}) {
  const ring =
    variant === "core"
      ? "border-teal-500/50 shadow-lg shadow-teal-500/10"
      : variant === "source"
        ? "border-amber-500/30"
        : "border-indigo-500/30";

  return (
    <div
      className={`flex flex-1 flex-col items-center rounded-2xl border bg-slate-900/60 px-5 py-5 backdrop-blur ${ring}`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
