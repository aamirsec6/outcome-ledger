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
import { ClerkUserMenu } from "@/components/clerk-user-menu";
import { InboxNavBadge } from "@/components/inbox-nav-badge";
import { NAV, PRODUCT_TAGLINE } from "@/lib/copy";

const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

const nav = [
  { href: "/overview", label: NAV.overview, icon: LayoutDashboard },
  { href: "/teams", label: NAV.teams, icon: Users },
  { href: "/integrations", label: NAV.integrations, icon: Cable },
  { href: "/reports", label: NAV.reports, icon: FileText },
  { href: "/contracts", label: NAV.winDefinition, icon: ScrollText },
  { href: "/settings", label: NAV.settings, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-56 shrink-0 flex-col px-3 py-5"
      style={{
        borderRight: "1px solid var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 theme-accent" style={{ color: "var(--accent)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Outcome Ledger
            </p>
            <p className="text-[10px] uppercase tracking-wider theme-text-dim">
              {PRODUCT_TAGLINE}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-accent-dim theme-accent" : "theme-nav-link",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {href === "/overview" ? <InboxNavBadge /> : null}
            </Link>
          );
        })}
      </nav>
      {clerkOn ? (
        <ClerkUserMenu />
      ) : (
        <p className="mt-auto px-2 text-[10px] theme-text-dim">
          Not affiliated with Authon
        </p>
      )}
    </aside>
  );
}
