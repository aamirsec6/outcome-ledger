import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Accent = "emerald" | "cyan" | "amber" | "violet";

const PALETTE: Record<
  Accent,
  { from: string; to: string; glow: string; ring: string }
> = {
  emerald: {
    from: "from-emerald-300",
    to: "to-emerald-800",
    glow: "rgba(52,211,153,0.28)",
    ring: "ring-emerald-400/20",
  },
  cyan: {
    from: "from-cyan-300",
    to: "to-cyan-900",
    glow: "rgba(34,211,238,0.28)",
    ring: "ring-cyan-400/20",
  },
  amber: {
    from: "from-amber-300",
    to: "to-amber-800",
    glow: "rgba(251,191,36,0.28)",
    ring: "ring-amber-400/20",
  },
  violet: {
    from: "from-violet-300",
    to: "to-violet-900",
    glow: "rgba(167,139,250,0.28)",
    ring: "ring-violet-400/20",
  },
};

export function LuxeIcon({
  icon: Icon,
  accent = "emerald",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  accent?: Accent;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const p = PALETTE[accent];
  const box =
    size === "lg" ? "h-16 w-16 rounded-[1.25rem]" : size === "sm" ? "h-11 w-11 rounded-xl" : "h-14 w-14 rounded-2xl";
  const iconSize = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className="pointer-events-none absolute -inset-2 rounded-[1.75rem] opacity-70 blur-xl"
        style={{ background: p.glow }}
      />
      <div
        className={cn(
          "relative flex items-center justify-center bg-gradient-to-br ring-1",
          box,
          p.from,
          p.to,
          p.ring,
        )}
        style={{
          boxShadow:
            "0 16px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.2)",
        }}
      >
        <Icon className={cn(iconSize, "text-white drop-shadow")} strokeWidth={1.65} />
        <div className="pointer-events-none absolute inset-x-3 top-1.5 h-2 rounded-full bg-white/30 blur-[2px]" />
      </div>
    </div>
  );
}
