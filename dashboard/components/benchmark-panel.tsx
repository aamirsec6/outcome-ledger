"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { usdCpst } from "@/lib/format";

export type BenchmarkReport = {
  periodLabel: string;
  verdict: string;
  current: {
    cpstUsd: number;
    linkedSpendPct: number;
    avgLinkConfidence: number;
    linkCount: number;
    engine: string;
  };
  improvements: {
    cpstPctChange?: number | null;
    linkedSpendPctChange?: number | null;
    avgConfidencePctChange?: number | null;
    priorPeriod?: string;
  };
  workflows: {
    workflowType: string;
    linkedSpendUsd: number;
    outcomeCount: number;
    cpstUsd: number;
  }[];
  history: {
    period: string;
    cpstUsd: number;
    linkedSpendPct: number;
  }[];
};

function DeltaBadge({ value, invert }: { value: number | null | undefined; invert?: boolean }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs theme-text-dim">
        <Minus className="h-3 w-3" /> n/a
      </span>
    );
  }
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  const Icon = good ? TrendingDown : bad ? TrendingUp : Minus;
  const color = good ? "text-emerald-400" : bad ? "text-red-400" : "theme-text-dim";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${color}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {Math.round(value)}%
    </span>
  );
}

export function BenchmarkPanel({
  report,
}: {
  report: BenchmarkReport | null | undefined;
}) {
  if (!report) {
    return (
      <section className="theme-panel rounded-xl p-5 text-sm theme-text-muted">
        Benchmark data unavailable — run Sync to rebuild attribution graph.
      </section>
    );
  }

  const verdictLabel =
    report.verdict === "improving"
      ? "CPST improving vs prior period"
      : report.verdict === "worsening"
        ? "CPST rising — investigate spend or outcome volume"
        : report.verdict === "attribution_improving"
          ? "Outcome-linked spend improving"
          : "Building benchmark history";

  const verdictColor =
    report.verdict === "improving" || report.verdict === "attribution_improving"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : report.verdict === "worsening"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-[var(--border)] bg-[var(--bg-inset)] theme-text-muted";

  return (
    <section className="theme-panel space-y-4 rounded-xl p-5">
      <div>
        <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>
          Benchmark intelligence
        </h2>
        <p className="text-xs theme-text-muted">
          {report.periodLabel} · persisted graph ({report.current.engine}) ·{" "}
          {report.current.linkCount} links
        </p>
      </div>

      <div className={`rounded-lg border px-3 py-2 text-xs ${verdictColor}`}>{verdictLabel}</div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="theme-card rounded-lg px-3 py-2">
          <p className="text-xs theme-text-dim">Org CPST</p>
          <p className="text-lg font-semibold tabular-nums">{usdCpst(report.current.cpstUsd)}</p>
          <DeltaBadge value={report.improvements.cpstPctChange} invert />
          {report.improvements.priorPeriod ? (
            <p className="mt-1 text-[10px] theme-text-dim">vs {report.improvements.priorPeriod}</p>
          ) : null}
        </div>
        <div className="theme-card rounded-lg px-3 py-2">
          <p className="text-xs theme-text-dim">Linked spend</p>
          <p className="text-lg font-semibold tabular-nums">
            {Math.round(report.current.linkedSpendPct)}%
          </p>
          <DeltaBadge value={report.improvements.linkedSpendPctChange} />
        </div>
        <div className="theme-card rounded-lg px-3 py-2">
          <p className="text-xs theme-text-dim">Avg link confidence</p>
          <p className="text-lg font-semibold tabular-nums">
            {Math.round(report.current.avgLinkConfidence * 100)}%
          </p>
          <DeltaBadge value={report.improvements.avgConfidencePctChange} />
        </div>
      </div>

      {report.workflows.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium theme-text-muted">CPST by workflow (linked spend)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="theme-text-dim border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="pb-2 pr-3">Workflow</th>
                  <th className="pb-2 pr-3">Outcomes</th>
                  <th className="pb-2 pr-3">Linked $</th>
                  <th className="pb-2">CPST</th>
                </tr>
              </thead>
              <tbody>
                {report.workflows.map((w) => (
                  <tr key={w.workflowType} className="border-b border-[var(--border)]/50">
                    <td className="py-2 pr-3 capitalize">{w.workflowType}</td>
                    <td className="py-2 pr-3 tabular-nums">{w.outcomeCount}</td>
                    <td className="py-2 pr-3 tabular-nums">${w.linkedSpendUsd.toLocaleString()}</td>
                    <td className="py-2 tabular-nums">{usdCpst(w.cpstUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
