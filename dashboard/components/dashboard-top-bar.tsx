"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { DashboardSearch } from "@/components/dashboard-search";
import { MobileNav } from "@/components/mobile-nav";
import { SignOutButton } from "@/components/sign-out-button";

type Props = {
  title?: string;
  subtitle?: string;
};

export function DashboardTopBar({ title, subtitle }: Props) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 px-6 py-3 backdrop-blur md:px-8"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {title ? (
            <h1 className="truncate text-lg font-semibold tracking-tight theme-heading">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="truncate text-xs theme-text-dim">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-end">
          <MobileNav />
          <DashboardSearch />
          <Link
            href="/integrations"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm theme-text-muted transition-colors hover:bg-[var(--bg-hover)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </Link>
          <SignOutButton variant="topbar" />
        </div>
      </div>
    </header>
  );
}
