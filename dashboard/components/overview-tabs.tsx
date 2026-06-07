"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "output", label: "Output" },
  { id: "ai", label: "AI & spend" },
  { id: "attribution", label: "Attribution" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  summary: React.ReactNode;
  output: React.ReactNode;
  ai: React.ReactNode;
  attribution: React.ReactNode;
};

export function OverviewTabs({ summary, output, ai, attribution }: Props) {
  const [tab, setTab] = useState<TabId>("summary");

  const panels: Record<TabId, React.ReactNode> = {
    summary,
    output,
    ai,
    attribution,
  };

  return (
    <div className="space-y-4">
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-1"
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-[var(--bg-card)] theme-heading shadow-sm"
                : "theme-text-muted hover:theme-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="space-y-6">
        {panels[tab]}
      </div>
    </div>
  );
}
