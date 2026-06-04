"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
