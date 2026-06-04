"use client";

export function MarketingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#070708]" />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(52, 211, 153, 0.15), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(251, 191, 36, 0.06), transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute left-1/2 top-[20%] h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-30 blur-[100px] animate-pulse-glow"
        style={{ background: "var(--accent-glow)" }}
      />
    </div>
  );
}
