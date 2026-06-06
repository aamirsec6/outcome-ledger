"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/marketing-content";
import { PageContainer } from "@/components/marketing/page-container";
import { cn } from "@/lib/cn";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="scroll-mt-28 border-t border-[var(--border)] py-20 md:py-28"
    >
      <PageContainer>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
              Common questions
            </h2>
            <p className="mt-4 max-w-md text-[var(--text-muted)]">
              Plain answers. No jargon wall.
            </p>
          </div>
          <div>

        <div className="space-y-2">
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
                <span className="text-sm font-medium text-white">{item.q}</span>
                <Plus
                  className={cn(
                    "h-4 w-4 shrink-0 text-[var(--text-dim)] transition",
                    open === i && "rotate-45",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <p className="overflow-hidden px-5 pb-4 text-sm leading-relaxed text-[var(--text-muted)]">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
