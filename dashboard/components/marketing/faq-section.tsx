"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/marketing-content";
import { cn } from "@/lib/cn";
import { SectionLabel } from "./section-label";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 border-t border-slate-800/60 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <SectionLabel code="FAQ" />
        <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          Common questions
        </h2>

        <div className="mt-10 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/30">
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-white">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-500 transition",
                    open === i && "rotate-180"
                  )}
                />
              </button>
              {open === i && (
                <p className="border-t border-slate-800/60 px-5 pb-4 pt-0 text-sm leading-relaxed text-slate-400">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
