import Link from "next/link";
import { DashboardLink } from "@/components/dashboard-link";
import { PageContainer } from "@/components/marketing/page-container";

const COLS = [
  {
    title: "Features",
    links: [
      { href: "#product", label: "Platform" },
      { href: "#get-started", label: "Early access" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "#faq", label: "FAQ" },
      { label: "API", href: "https://outcome-ledger-production.up.railway.app/health" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/join", label: "Join" },
      { label: "Dashboard", dashboard: true },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-16">
      <PageContainer className="grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="text-sm font-medium text-white">Outcome Ledger</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-dim)]">
            Value accounting for AI-assisted engineering. CPST your CFO can sign.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium text-white">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  {"dashboard" in link && link.dashboard ? (
                    <DashboardLink className="text-sm text-[var(--text-dim)] hover:text-[var(--text-muted)]">
                      {link.label}
                    </DashboardLink>
                  ) : (
                    <Link
                      href={link.href!}
                      className="text-sm text-[var(--text-dim)] hover:text-[var(--text-muted)]"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-12 text-xs text-[var(--text-dim)] md:col-span-4">
          © {new Date().getFullYear()} Outcome Ledger
        </p>
      </PageContainer>
    </footer>
  );
}
