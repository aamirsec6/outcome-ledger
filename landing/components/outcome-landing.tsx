"use client";

import { useState } from "react";
import { MarketingBackground } from "@/components/marketing/marketing-background";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HeroResend } from "@/components/marketing/hero-resend";
import { ValueLayerSection } from "@/components/marketing/value-layer-section";
import { ValueProofSection } from "@/components/marketing/value-proof-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { AudienceSection } from "@/components/marketing/audience-section";
import { ControlSection } from "@/components/marketing/control-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PageContainer } from "@/components/marketing/page-container";
import { WaitlistForm } from "@/components/waitlist-form";

export function OutcomeLanding() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | undefined>();

  return (
    <div className="min-h-screen text-[var(--text)]">
      <MarketingBackground />
      <MarketingNav spotsRemaining={spotsRemaining} />
      <HeroResend />
      <ValueProofSection />
      <ValueLayerSection />
      <HowItWorksSection />
      <AudienceSection />
      <ControlSection />
      <FaqSection />

      <section
        id="get-started"
        className="scroll-mt-28 border-t border-[var(--border)] py-20 md:py-28"
      >
        <PageContainer>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div>
              <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
                See your cost per win
              </h2>
              <p className="mt-4 max-w-md text-[var(--text-muted)] lg:text-lg">
                Join the design partner list. We help you connect AI spend and GitHub in under a
                day.
              </p>
              {spotsRemaining != null && spotsRemaining > 0 ? (
                <p className="mt-6 text-sm text-[var(--text-dim)]">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent)] align-middle" />
                  {spotsRemaining} spots left in this cohort
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 lg:p-10">
              <WaitlistForm
                path="/"
                onStats={(s) => setSpotsRemaining(s.spotsRemaining)}
              />
            </div>
          </div>
        </PageContainer>
      </section>

      <FinalCta />
      <MarketingFooter />
    </div>
  );
}
