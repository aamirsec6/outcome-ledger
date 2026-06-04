"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLink } from "@/components/dashboard-link";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav({ spotsRemaining }: { spotsRemaining?: number }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        scrolled ? "py-2" : "py-4"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between px-4 transition-all md:px-6",
          scrolled
            ? "rounded-2xl border border-[var(--border)] bg-[var(--bg)]/80 shadow-lg shadow-black/20 backdrop-blur-xl"
            : ""
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
            <span className="font-display text-sm font-bold text-emerald-400">OL</span>
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-white">
            Outcome Ledger
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-[var(--bg-elevated)] hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <DashboardLink className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white">
            Dashboard
          </DashboardLink>
          <a
            href="#get-started"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            Join waitlist
            {spotsRemaining != null && spotsRemaining < 15 ? (
              <span className="ml-1 font-normal text-zinc-500">({spotsRemaining})</span>
            ) : null}
          </a>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-zinc-400 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-4 mt-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <DashboardLink className="block px-3 py-2.5 text-sm text-zinc-500">Dashboard</DashboardLink>
          <a
            href="#get-started"
            className="mt-2 block rounded-full bg-white py-3 text-center text-sm font-semibold text-zinc-950"
            onClick={() => setOpen(false)}
          >
            Join waitlist
          </a>
        </div>
      )}
    </header>
  );
}
