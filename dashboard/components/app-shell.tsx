"use client";

import { usePathname } from "next/navigation";
import { DashboardTopBar } from "@/components/dashboard-top-bar";
import { Sidebar } from "@/components/sidebar";
import { titleForPath } from "@/lib/page-titles";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing =
    pathname === "/join" ||
    pathname?.startsWith("/join/") ||
    pathname === "/onboarding" ||
    pathname?.startsWith("/onboarding/") ||
    pathname === "/" ||
    pathname === "/sign-in" ||
    pathname?.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname?.startsWith("/sign-up/");

  if (isMarketing) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar title={titleForPath(pathname)} />
        <main className="flex-1 overflow-auto px-6 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
