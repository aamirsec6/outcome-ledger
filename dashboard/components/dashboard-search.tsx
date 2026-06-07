"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { NAV } from "@/lib/copy";

type Item = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  keywords?: string;
};

const ITEMS: Item[] = [
  { id: "overview", label: NAV.overview, hint: "Spend, wins, cost per win", href: "/overview", keywords: "home dashboard cpst" },
  { id: "teams", label: NAV.teams, hint: "Cost per win by team", href: "/teams", keywords: "squads" },
  { id: "integrations", label: NAV.integrations, hint: "GitHub, Cursor, sync", href: "/integrations", keywords: "connect github cursor sync" },
  { id: "reports", label: NAV.reports, hint: "Export board pack", href: "/reports", keywords: "pdf csv export" },
  { id: "contracts", label: NAV.winDefinition, hint: "What counts as a win", href: "/contracts", keywords: "win rules pr" },
  { id: "settings", label: NAV.settings, hint: "Teams, alerts, API key", href: "/settings", keywords: "notifications slack" },
];

export function DashboardSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint?.toLowerCase().includes(q) ||
        item.keywords?.includes(q),
    );
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 theme-text-dim" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search pages…"
          className="w-full bg-transparent text-sm outline-none placeholder:theme-text-dim"
          aria-label="Search dashboard"
          role="combobox"
          aria-expanded={open}
          aria-controls="dashboard-search-list"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, filtered.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter" && filtered[active]) {
              go(filtered[active].href);
            }
          }}
        />
        <kbd className="hidden shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] theme-text-dim sm:inline">
          ⌘K
        </kbd>
      </div>
      {open && filtered.length > 0 ? (
        <ul
          id="dashboard-search-list"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg"
          role="listbox"
        >
          {filtered.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                  i === active ? "bg-[var(--bg-hover)]" : ""
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item.href)}
              >
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {item.label}
                </span>
                {item.hint ? (
                  <span className="text-xs theme-text-dim">{item.hint}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
