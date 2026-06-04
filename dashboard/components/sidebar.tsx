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

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Cable },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/contracts", label: "Outcome contract", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-3 py-5">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-teal-400" />
          <div>
            <p className="text-sm font-semibold text-white">Outcome Ledger</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Value accounting
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
                active
                  ? "bg-teal-500/15 text-teal-300"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-auto px-2 text-[10px] text-slate-600">
        Not affiliated with Authon
      </p>
    </aside>
  );
}
