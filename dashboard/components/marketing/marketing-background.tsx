"use client";

export function MarketingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#030712]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.15) 1px, transparent 0)
          `,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -left-1/4 top-0 h-[70vh] w-[70vw] rounded-full bg-teal-500/10 blur-[120px]" />
      <div className="absolute -right-1/4 top-1/3 h-[50vh] w-[60vw] rounded-full bg-indigo-600/15 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-[40vh] w-[50vw] rounded-full bg-violet-600/10 blur-[90px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.03) 2px,
            rgba(255,255,255,0.03) 4px
          )`,
        }}
      />
    </div>
  );
}
