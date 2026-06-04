"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/marketing-content";
import { cn } from "@/lib/cn";
import { SectionLabel } from "./section-label";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-28 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <SectionLabel code="FAQ" />
        <h2 className="font-display mt-4 text-3xl font-semibold text-white">
          Common questions
        </h2>

        <div className="mt-10 space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-zinc-200">{item.q}</span>
                <Plus
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-500 transition",
                    open === i && "rotate-45"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <p className="overflow-hidden px-5 pb-4 text-sm leading-relaxed text-zinc-500">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
