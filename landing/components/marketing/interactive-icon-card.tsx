"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  icon: LucideIcon;
  accent?: "emerald" | "cyan" | "amber";
  className?: string;
};

const ACCENTS = {
  emerald: {
    from: "from-emerald-400",
    to: "to-emerald-700",
    glow: "rgba(52,211,153,0.35)",
    shadow: "rgba(52,211,153,0.2)",
  },
  cyan: {
    from: "from-cyan-400",
    to: "to-cyan-800",
    glow: "rgba(34,211,238,0.35)",
    shadow: "rgba(34,211,238,0.2)",
  },
  amber: {
    from: "from-amber-400",
    to: "to-amber-700",
    glow: "rgba(251,191,36,0.35)",
    shadow: "rgba(251,191,36,0.2)",
  },
};

export function InteractiveIconCard({
  icon: Icon,
  accent = "emerald",
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const palette = ACCENTS[accent];

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 22}deg) rotateX(${-y * 22}deg) scale3d(1.02,1.02,1.02)`;
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform =
      "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "relative mb-4 inline-block transition-transform duration-200 ease-out",
        className,
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className="pointer-events-none absolute -inset-1 rounded-2xl opacity-40 blur-md"
        style={{ background: palette.glow }}
      />
      <div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
          palette.from,
          palette.to,
        )}
        style={{
          boxShadow: `0 12px 32px ${palette.shadow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
          transform: "translateZ(12px)",
        }}
      >
        <Icon className="h-7 w-7 text-white drop-shadow-md" strokeWidth={1.75} />
        <div
          className="pointer-events-none absolute inset-x-2 top-1 h-3 rounded-full bg-white/25 blur-sm"
          style={{ transform: "translateZ(14px)" }}
        />
      </div>
    </div>
  );
}
