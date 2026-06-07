"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SectionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

type Props = {
  sections: SectionItem[];
  panels: Record<string, React.ReactNode>;
  defaultSection?: string;
};

export function SectionNav({ sections, panels, defaultSection }: Props) {
  const [active, setActive] = useState(defaultSection ?? sections[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav
        className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] p-1 lg:w-52 lg:shrink-0 lg:flex-col lg:overflow-visible"
        role="tablist"
        aria-label="Sections"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          const selected = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(section.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors lg:w-full",
                selected
                  ? "bg-[var(--bg-card)] font-medium theme-heading shadow-sm"
                  : "theme-text-muted hover:theme-text",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </nav>
      <div role="tabpanel" className="min-w-0 flex-1 space-y-6">
        {panels[active]}
      </div>
    </div>
  );
}
