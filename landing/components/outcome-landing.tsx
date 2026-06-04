"use client";

import { useState } from "react";
import { MarketingBackground } from "@/components/marketing/marketing-background";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroResend } from "@/components/marketing/hero-resend";
import { IntegrateSection } from "@/components/marketing/integrate-section";
import { DeveloperExperience } from "@/components/marketing/developer-experience";
import { LayersSection } from "@/components/marketing/layers-section";
import { ControlSection } from "@/components/marketing/control-section";
import { QuotesSection } from "@/components/marketing/quotes-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { WaitlistForm } from "@/components/waitlist-form";

export function OutcomeLanding() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | undefined>();

  return (
    <div className="min-h-screen text-[var(--text)]">
      <MarketingBackground />
      <MarketingNav spotsRemaining={spotsRemaining} />
      <HeroResend />
      <IntegrateSection />
      <DeveloperExperience />
      <LayersSection />
      <ControlSection />
      <QuotesSection />
      <FaqSection />

      <section
        id="get-started"
        className="scroll-mt-28 border-t border-[var(--border)] px-4 py-20 md:py-28"
      >
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
            Get on the design partner list
          </h2>
          <p className="mt-3 text-[var(--text-muted)]">
            Connect vendors and GitHub in under a day. We onboard teams with the
            sharpest ROI pain first.
          </p>
          {spotsRemaining != null && spotsRemaining > 0 ? (
            <p className="mt-4 text-sm text-[var(--text-dim)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)] align-middle mr-2" />
              {spotsRemaining} spots left in this cohort
            </p>
          ) : null}
        </div>
        <div className="mx-auto mt-10 max-w-lg">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
            <WaitlistForm
              path="/"
              onStats={(s) => setSpotsRemaining(s.spotsRemaining)}
            />
          </div>
        </div>
      </section>

      <FinalCta />
      <MarketingFooter />
    </div>
  );
}
