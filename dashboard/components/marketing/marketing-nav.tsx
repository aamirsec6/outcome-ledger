"use client";

import Link from "next/link";
import { BarChart3, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#metrics", label: "Metrics" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav({ spotsRemaining }: { spotsRemaining?: number }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-slate-800/80 bg-slate-950/85 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-teal-400" />
          <span className="font-semibold text-white">Outcome Ledger</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/overview"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Dashboard
          </Link>
          <a
            href="#get-started"
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
          >
            Join waitlist
            {spotsRemaining != null && spotsRemaining < 20 ? (
              <span className="ml-1.5 text-teal-900/70">· {spotsRemaining} left</span>
            ) : null}
          </a>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-800 bg-slate-950/95 px-4 py-4 md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-2 text-sm text-slate-300"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link href="/overview" className="block py-2 text-sm text-slate-400">
            Dashboard
          </Link>
          <a
            href="#get-started"
            className="mt-2 block rounded-lg bg-teal-500 py-2.5 text-center text-sm font-semibold text-slate-950"
            onClick={() => setOpen(false)}
          >
            Join waitlist
          </a>
        </div>
      )}
    </header>
  );
}
