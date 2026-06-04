"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

const options: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="theme-panel rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Monitor className="h-5 w-5 theme-accent" />
        <div>
          <h2 className="font-medium" style={{ color: "var(--text)" }}>
            Appearance
          </h2>
          <p className="text-sm theme-text-muted">
            Match the marketing site — emerald accents, clean cards
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              theme === id
                ? "bg-accent-dim theme-accent"
                : "theme-card theme-text-muted hover:opacity-90",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
