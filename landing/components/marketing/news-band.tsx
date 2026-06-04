"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { WAITLIST_NEWS } from "@/lib/waitlist-news";
import { cn } from "@/lib/cn";

const ITEMS = WAITLIST_NEWS.filter((n) => n.volatile);

export function NewsBand() {
  const [i, setI] = useState(0);
  const items = ITEMS.length ? ITEMS : WAITLIST_NEWS;
  const current = items[i % items.length];

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 5500);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="border-b border-rose-500/20 bg-rose-950/20">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3">
        <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400/90">
            Industry signal
          </p>
          <p
            key={current.id}
            className="mt-0.5 animate-fade-in text-sm font-medium text-slate-200"
          >
            {current.headline}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded border border-rose-500/30 px-2 py-0.5 text-[10px] uppercase text-rose-300/80"
          )}
        >
          Live narrative
        </span>
      </div>
    </div>
  );
}
