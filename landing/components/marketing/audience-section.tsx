import { Briefcase, HelpCircle, LineChart, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AUDIENCE_CARDS } from "@/lib/marketing-content";
import { LuxeIcon } from "@/components/marketing/luxe-icon";
import { PageContainer } from "@/components/marketing/page-container";

const ICONS: LucideIcon[] = [Briefcase, LineChart, Users, HelpCircle];
const ACCENTS = ["emerald", "cyan", "amber", "violet"] as const;

export function AudienceSection() {
  return (
    <section
      id="use-cases"
      className="scroll-mt-28 border-t border-[var(--border)] py-20 md:py-28"
    >
      <PageContainer>
        <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-white md:text-4xl">
          Built for anyone asking &ldquo;was it worth it?&rdquo;
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--text-muted)] lg:text-lg">
          You do not need to be an engineer to read the dashboard. The math is simple. The proof
          exports cleanly.
        </p>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {AUDIENCE_CARDS.map((card, i) => (
            <article
              key={card.role}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:p-7"
            >
              <LuxeIcon icon={ICONS[i]} accent={ACCENTS[i]} size="sm" />
              <p className="mt-5 text-xs font-medium uppercase tracking-wider text-emerald-500/80">
                {card.role}
              </p>
              <h3 className="mt-3 text-lg font-medium leading-snug text-white">{card.question}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{card.answer}</p>
            </article>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
