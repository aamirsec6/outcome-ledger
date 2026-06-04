"use client";

import {
  BarChart3,
  FileCheck,
  GitBranch,
  Link2,
  Shield,
  Zap,
} from "lucide-react";
import { InteractiveIconCard } from "./interactive-icon-card";

const ICONS: {
  icon: typeof BarChart3;
  label: string;
  accent?: "emerald" | "cyan" | "amber";
}[] = [
  { icon: BarChart3, label: "CPST", accent: "emerald" },
  { icon: GitBranch, label: "Outcomes", accent: "cyan" },
  { icon: Link2, label: "Attribution", accent: "cyan" },
  { icon: FileCheck, label: "Reports", accent: "emerald" },
  { icon: Shield, label: "Contracts", accent: "amber" },
  { icon: Zap, label: "Sync", accent: "amber" },
];

export function IconShowcaseRow() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]/50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs uppercase tracking-widest text-[var(--text-dim)]">
          Interactive 3D · hover each icon
        </p>
        <div className="mt-8 flex flex-wrap items-end justify-center gap-10 md:gap-14">
          {ICONS.map(({ icon, label, accent }) => (
            <div key={label} className="group flex flex-col items-center gap-3">
              <InteractiveIconCard icon={icon} accent={accent} />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {label}
              </span>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-[11px] leading-relaxed text-[var(--text-dim)]">
          Hero scene uses{" "}
          <a
            href="https://github.com/pmndrs/react-three-fiber"
            className="text-[var(--accent)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            React Three Fiber
          </a>{" "}
          (MIT). Card icons use CSS 3D tilt — no extra assets required.
        </p>
      </div>
    </section>
  );
}
