"use client";

import { useState } from "react";
import { MarketingBackground } from "@/components/marketing/marketing-background";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroFlow } from "@/components/marketing/hero-flow";
import { StatsMarquee } from "@/components/marketing/stats-marquee";
import { NewsBand } from "@/components/marketing/news-band";
import { LayersSection } from "@/components/marketing/layers-section";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { MetricsSection } from "@/components/marketing/metrics-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { SectionLabel } from "@/components/marketing/section-label";
import { WaitlistForm } from "@/components/waitlist-form";
import { Flame } from "lucide-react";

export function OutcomeLanding() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | undefined>();

  return (
    <div className="min-h-screen text-slate-100">
      <MarketingBackground />
      <MarketingNav spotsRemaining={spotsRemaining} />
      <NewsBand />
      <HeroFlow />
      <StatsMarquee />
      <LayersSection />
      <MetricsSection />
      <UseCasesSection />
      <FaqSection />

      <section
        id="get-started"
        className="scroll-mt-24 border-t border-slate-800/60 px-4 py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <SectionLabel code="Get started" />
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
            Ready to report cost per accepted outcome?
          </h2>
          <p className="mt-3 max-w-xl text-slate-400">
            Join design partners building CPST before the next board review.{" "}
            {spotsRemaining != null && spotsRemaining > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-300/90">
                <Flame className="h-3.5 w-3.5" />
                {spotsRemaining} spots left this cohort.
              </span>
            ) : null}
          </p>

          <div className="mt-10 rounded-2xl border border-slate-700/80 bg-slate-900/50 p-6 shadow-2xl shadow-teal-500/5 backdrop-blur md:p-10">
            <WaitlistForm path="/" onStats={(s) => setSpotsRemaining(s.spotsRemaining)} />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
