"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MarketingBackground } from "@/components/marketing/marketing-background";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { WaitlistForm } from "@/components/waitlist-form";
import { WAITLIST_NEWS } from "@/lib/waitlist-news";

export function WaitlistLanding() {
  const [newsIndex, setNewsIndex] = useState(0);
  const [spots, setSpots] = useState(50);
  const [percentFull, setPercentFull] = useState(0);

  const items = useMemo(() => WAITLIST_NEWS.filter((n) => n.volatile), []);
  const active = items.length ? items : WAITLIST_NEWS;
  const current = active[newsIndex % active.length];

  useEffect(() => {
    const t = setInterval(() => setNewsIndex((i) => (i + 1) % active.length), 6000);
    return () => clearInterval(t);
  }, [active.length]);

  return (
    <div className="min-h-screen text-zinc-100">
      <MarketingBackground />
      <MarketingNav spotsRemaining={spots} />

      <div className="mx-auto max-w-6xl px-4 pt-28 pb-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition hover:text-zinc-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div>
            <p className="font-mono-label text-[11px] uppercase tracking-wider text-emerald-500/80">
              Industry context
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white md:text-4xl">
              {current.headline}
            </h1>
            <p className="mt-4 text-zinc-500 leading-relaxed">{current.detail}</p>
            <p className="mt-2 text-xs text-zinc-700">{current.source}</p>

            <div className="mt-8 h-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-emerald-500/80 transition-all duration-700"
                style={{ width: `${percentFull}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              {spots} spots remaining · {percentFull}% cohort filled
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
            <WaitlistForm
              path="/join"
              onStats={(s) => {
                setSpots(s.spotsRemaining);
                setPercentFull(s.percentFull);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
