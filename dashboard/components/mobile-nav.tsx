"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { InboxNavBadge } from "@/components/inbox-nav-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { NAV } from "@/lib/copy";

const links = [
  { href: "/overview", label: NAV.overview, badge: true },
  { href: "/teams", label: NAV.teams },
  { href: "/integrations", label: NAV.integrations },
  { href: "/reports", label: NAV.reports },
  { href: "/contracts", label: NAV.winDefinition },
  { href: "/settings", label: NAV.settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] p-2 theme-text-muted"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-xl">
            <p className="mb-4 text-sm font-semibold theme-heading">Outcome Ledger</p>
            <ul className="flex flex-1 flex-col gap-1">
              {links.map(({ href, label, badge }) => {
                const active =
                  pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                        active
                          ? "bg-accent-dim font-medium theme-accent"
                          : "theme-text-muted",
                      )}
                    >
                      {label}
                      {badge ? <InboxNavBadge /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <SignOutButton variant="sidebar" />
          </nav>
        </>
      ) : null}
    </div>
  );
}
