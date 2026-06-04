"use client";

import Link from "next/link";
import { ArrowLeft, Flame, Newspaper, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { WAITLIST_NEWS, type NewsItem } from "@/lib/waitlist-news";
import { captureUtmFromUrl } from "@/lib/waitlist-tracking";
import { WaitlistForm } from "@/components/waitlist-form";
import { MarketingBackground } from "@/components/marketing/marketing-background";

function tagColor(tag: NewsItem["tag"]) {
  switch (tag) {
    case "budget":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "roi":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "leadership":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    default:
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  }
}

/** Dedicated waitlist page with full news context — main marketing lives at `/`. */
export function WaitlistLanding() {
  const [newsIndex, setNewsIndex] = useState(0);
  const [spots, setSpots] = useState(50);
  const [percentFull, setPercentFull] = useState(0);

  const volatileNews = useMemo(() => WAITLIST_NEWS.filter((n) => n.volatile), []);
  const activeNews = volatileNews.length ? volatileNews : WAITLIST_NEWS;

  useEffect(() => {
    captureUtmFromUrl();
    const t = setInterval(() => {
      setNewsIndex((i) => (i + 1) % activeNews.length);
    }, 6000);
    return () => clearInterval(t);
  }, [activeNews.length]);

  const current = activeNews[newsIndex];

  return (
    <div className="min-h-screen text-slate-100">
      <MarketingBackground />

      <div className="relative border-b border-amber-500/30 bg-amber-950/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-4 py-2 text-center text-sm">
          <Flame className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <span className="font-medium text-amber-100">
            Design partner waitlist —{" "}
            <strong className="text-white">{spots} spots left</strong>
          </span>
          <span className="text-amber-200/80">·</span>
          <span className="text-amber-200/90">{percentFull}% full</span>
        </div>
        <div
          className="h-0.5 bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 transition-all duration-700"
          style={{ width: `${Math.min(100, percentFull)}%` }}
        />
      </div>

      <div className="relative border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3">
          <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-rose-400/90">
              Why teams are scrambling now
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{current.headline}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-400">{current.detail}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase",
              tagColor(current.tag)
            )}
          >
            {current.tag}
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="relative mx-auto grid max-w-5xl gap-10 px-4 pb-16 lg:grid-cols-2">
        <section>
          <h1 className="text-2xl font-bold text-white">Join the waitlist</h1>
          <p className="mt-2 text-slate-400">
            Full industry context + signup. Prefer the product tour?{" "}
            <Link href="/" className="text-teal-400 hover:underline">
              Start at home
            </Link>
            .
          </p>
          <ul className="mt-6 space-y-3">
            {WAITLIST_NEWS.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-xl border p-4",
                  item.id === current.id
                    ? "border-teal-500/50 bg-teal-500/5"
                    : "border-slate-800 bg-slate-900/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200">{item.headline}</p>
                  {item.volatile && (
                    <TrendingUp className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="waitlist"
          className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-6 md:p-8"
        >
          <WaitlistForm
            path="/join"
            onStats={(s) => {
              setSpots(s.spotsRemaining);
              setPercentFull(s.percentFull);
            }}
          />
        </section>
      </div>
    </div>
  );
}
