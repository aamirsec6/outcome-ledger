import Link from "next/link";
import { DashboardLink } from "@/components/dashboard-link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-4 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
        <div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
            <span className="font-display text-sm font-bold text-emerald-400">OL</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-600">
            Value accounting for AI-assisted engineering. Standalone — not Authon or Agent
            Money.
          </p>
        </div>
        <div className="flex gap-12 text-sm">
          <ul className="space-y-2 text-zinc-500">
            <li>
              <a href="#product" className="hover:text-zinc-300">
                Product
              </a>
            </li>
            <li>
              <a href="#get-started" className="hover:text-zinc-300">
                Waitlist
              </a>
            </li>
            <li>
              <Link href="/join" className="hover:text-zinc-300">
                Join page
              </Link>
            </li>
          </ul>
          <ul className="space-y-2 text-zinc-500">
            <li>
              <DashboardLink className="hover:text-zinc-300">Dashboard</DashboardLink>
            </li>
            <li>
              <DashboardLink path="/integrations" className="hover:text-zinc-300">
                Integrations
              </DashboardLink>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-center text-xs text-zinc-700 md:text-left">
        © {new Date().getFullYear()} Outcome Ledger · MIT
      </p>
    </footer>
  );
}
