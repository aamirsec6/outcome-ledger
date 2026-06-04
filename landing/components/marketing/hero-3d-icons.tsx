"use client";

import dynamic from "next/dynamic";

const Icon3DScene = dynamic(
  () => import("./icon-3d-scene").then((m) => ({ default: m.Icon3DScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(420px,50vh)] w-full items-center justify-center">
        <div className="h-32 w-32 animate-pulse rounded-full bg-emerald-500/10 blur-2xl" />
      </div>
    ),
  },
);

export function Hero3DIcons() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 65%)",
        }}
      />
      <Icon3DScene className="relative h-[min(420px,52vh)] w-full cursor-grab active:cursor-grabbing" />
      <p className="mt-2 text-center text-[11px] text-[var(--text-dim)] lg:text-left">
        Drag to explore · MIT Three.js · CPST · attribution · contracts
      </p>
    </div>
  );
}
