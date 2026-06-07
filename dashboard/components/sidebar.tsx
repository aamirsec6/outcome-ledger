"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cable,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { InboxNavBadge } from "@/components/inbox-nav-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { NAV } from "@/lib/copy";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: boolean;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Main",
    items: [
      { href: "/overview", label: NAV.overview, icon: LayoutDashboard, badge: true },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/teams", label: NAV.teams, icon: Users },
      { href: "/integrations", label: NAV.integrations, icon: Cable },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/reports", label: NAV.reports, icon: FileText },
      { href: "/contracts", label: NAV.winDefinition, icon: ScrollText },
      { href: "/settings", label: NAV.settings, icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-52 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-4 md:flex"
    >
      <Link href="/overview" className="mb-6 flex items-center gap-2 px-2 py-1">
        <BarChart3 className="h-5 w-5" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold theme-heading">Outcome Ledger</span>
      </Link>

      <div className="flex flex-1 flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider theme-text-dim">
              {group.label}
            </p>
            <nav className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active =
                  pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent-dim font-medium theme-accent"
                        : "theme-text-muted hover:bg-[var(--bg-hover)] hover:theme-text",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="truncate">{label}</span>
                    {badge ? <InboxNavBadge /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-2 border-t border-[var(--border)] pt-3">
        <SignOutButton variant="sidebar" />
      </div>
    </aside>
  );
}
