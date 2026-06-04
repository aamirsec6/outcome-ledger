"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLink } from "@/components/dashboard-link";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#product", label: "Features" },
  { href: "#use-cases", label: "Customers" },
  { href: "#faq", label: "Help" },
];

export function MarketingNav({ spotsRemaining }: { spotsRemaining?: number }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full border-b transition-colors",
        scrolled
          ? "border-[var(--border)] bg-black/80 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-sm font-medium text-white">
          Outcome Ledger
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--text-muted)] transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <DashboardLink className="text-sm text-[var(--text-muted)] transition hover:text-white">
            Log in
          </DashboardLink>
          <a
            href="#get-started"
            className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Get started
            {spotsRemaining != null && spotsRemaining < 15 ? (
              <span className="ml-1 text-zinc-500">({spotsRemaining})</span>
            ) : null}
          </a>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-[var(--text-muted)] md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[var(--border)] bg-black px-4 py-4 md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-2.5 text-sm text-[var(--text-muted)]"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <DashboardLink className="block py-2.5 text-sm text-[var(--text-muted)]">
            Log in
          </DashboardLink>
          <a
            href="#get-started"
            className="mt-2 block rounded-lg bg-white py-3 text-center text-sm font-medium text-black"
            onClick={() => setOpen(false)}
          >
            Get started
          </a>
        </div>
      ) : null}
    </header>
  );
}
