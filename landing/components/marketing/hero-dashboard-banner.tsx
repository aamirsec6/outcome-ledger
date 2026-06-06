"use client";

import dynamic from "next/dynamic";
import {
  BarChart3,
  Cable,
  CheckCircle2,
  FileText,
  GitBranch,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

const HeroDashboardChart = dynamic(
  () =>
    import("./hero-dashboard-chart").then((m) => ({
      default: m.HeroDashboardChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 w-full animate-pulse rounded-md bg-emerald-500/10 sm:h-40" />
    ),
  },
);

const NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Teams", icon: Users },
  { label: "Integrations", icon: Cable },
  { label: "Reports", icon: FileText },
  { label: "Outcome contract", icon: ScrollText },
  { label: "Settings", icon: Settings },
];

export function HeroDashboardBanner() {
  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute -inset-6 rounded-3xl opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(52,211,153,0.2), transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[#070708] shadow-2xl shadow-black/60">
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[#0a0a0a] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="ml-2 font-mono-label text-[10px] text-[var(--text-dim)]">
            app.outcome-ledger.com/overview
          </span>
        </div>

        <div className="flex min-h-[400px] max-h-[min(560px,72vh)] text-left">
          <aside className="hidden w-[160px] shrink-0 flex-col border-r border-[var(--border)] bg-[#0a0a0a] px-2 py-3 sm:flex">
            <div className="mb-4 flex items-center gap-1.5 px-1">
              <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
              <div>
                <p className="text-[11px] font-semibold text-white">Outcome Ledger</p>
                <p className="text-[8px] uppercase tracking-wider text-[var(--text-dim)]">
                  Value accounting
                </p>
              </div>
            </div>
            <nav className="flex flex-col gap-0.5">
              {NAV.map(({ label, icon: Icon, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] ${
                    active
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "text-[var(--text-dim)]"
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
            <header className="mb-3">
              <h3 className="text-sm font-medium text-white">Overview</h3>
              <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">
                Last 90 days (live). CPST v1.0. Stable window 14d.
                <span className="ml-1 rounded bg-emerald-500/15 px-1 py-px text-[9px] text-emerald-400">
                  live
                </span>
              </p>
            </header>

            <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-[10px]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-medium text-white">
                  Board-ready attribution: 100%. Target at least 80%.
                </p>
                <p className="text-[var(--text-muted)]">
                  Spend is sufficiently tagged to teams for board-ready CPST.
                </p>
              </div>
            </div>

            <section className="mb-3 rounded-lg border border-[var(--border)] bg-[#111113] p-2.5">
              <div className="mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-[var(--accent)]" />
                <div>
                  <p className="text-[11px] font-medium text-white">Outcome-linked spend</p>
                  <p className="text-[9px] text-[var(--text-dim)]">
                    Spend in ±14/2d window around each accepted outcome
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5">
                  <p className="text-[9px] text-[var(--text-dim)]">Linked to outcomes</p>
                  <p className="text-sm font-semibold tabular-nums text-emerald-400">68%</p>
                  <p className="text-[9px] text-[var(--text-dim)]">$137.2k</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[#161618] px-2 py-1.5">
                  <p className="text-[9px] text-[var(--text-dim)]">Unlinked spend</p>
                  <p className="text-sm font-semibold tabular-nums text-white">$64.2k</p>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[#161618] px-2 py-1.5">
                  <p className="text-[9px] text-[var(--text-dim)]">Avg link confidence</p>
                  <p className="text-sm font-semibold tabular-nums text-white">78%</p>
                  <p className="text-[9px] text-[var(--text-dim)]">209 outcomes</p>
                </div>
              </div>
            </section>

            <div className="mb-3 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
              <Metric label="Total AI spend" value="$201.4k" hint="OpenAI, Anthropic, Cursor" />
              <Metric label="Stable outcomes" value="209" hint="Merged PRs, not reverted" />
              <Metric
                label="Org CPST"
                value="$962"
                hint="Down 12% vs prior week"
                accent
              />
              <Metric label="Attributed spend" value="100%" hint="Failure cost share 6%" accent />
            </div>

            <section className="rounded-lg border border-[var(--border)] bg-[#111113] p-2.5">
              <p className="text-[11px] font-medium text-white">CPST trend (weekly)</p>
              <p className="mb-2 text-[9px] text-[var(--text-dim)]">
                Fully loaded spend divided by accepted outcomes. Green when CPST falls.
              </p>
              <div className="mb-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-300">
                CPST improving. Down 12% vs prior week.
              </div>
              <HeroDashboardChart />
              <p className="mt-1 text-[8px] text-[var(--text-dim)]">
                Green dot means CPST down vs prior week. Lower CPST is better.
              </p>
            </section>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[var(--text-dim)]">
        Live dashboard preview with interactive cost per win chart
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${
        accent
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-[var(--border)] bg-[#161618]"
      }`}
    >
      <p className="text-[8px] font-medium uppercase tracking-wide text-[var(--text-dim)]">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[8px] text-[var(--text-dim)]">{hint}</p> : null}
    </div>
  );
}
