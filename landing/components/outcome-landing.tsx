"use client";

import { useState } from "react";
import { MarketingBackground } from "@/components/marketing/marketing-background";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroFlow } from "@/components/marketing/hero-flow";
import { StatsMarquee } from "@/components/marketing/stats-marquee";
import { LayersSection } from "@/components/marketing/layers-section";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { MetricsSection } from "@/components/marketing/metrics-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { SectionLabel } from "@/components/marketing/section-label";
import { WaitlistForm } from "@/components/waitlist-form";

export function OutcomeLanding() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | undefined>();

  return (
    <div className="min-h-screen text-zinc-100">
      <MarketingBackground />
      <MarketingNav spotsRemaining={spotsRemaining} />
      <HeroFlow />
      <StatsMarquee />
      <LayersSection />
      <MetricsSection />
      <UseCasesSection />
      <FaqSection />

      <section
        id="get-started"
        className="scroll-mt-28 border-t border-[var(--border)] px-4 py-24 md:py-32"
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionLabel code="Early access" />
            <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Get on the design partner list
            </h2>
            <p className="mt-4 text-zinc-500 leading-relaxed">
              We onboard teams with the sharpest ROI pain first — connect vendors and
              GitHub in under a day.
            </p>
            {spotsRemaining != null && spotsRemaining > 0 && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  <strong className="font-medium text-zinc-200">{spotsRemaining}</strong>{" "}
                  spots left in this cohort
                </span>
              </p>
            )}
          </div>

          <div className="relative">
            <div
              className="absolute -inset-px rounded-2xl opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-glow), transparent 50%, var(--warm-dim))",
              }}
            />
            <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
              <WaitlistForm
                path="/"
                onStats={(s) => setSpotsRemaining(s.spotsRemaining)}
              />
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
