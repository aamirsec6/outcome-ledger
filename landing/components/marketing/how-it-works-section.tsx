import { BarChart3, Link2, Plug } from "lucide-react";
import { LuxeIcon } from "@/components/marketing/luxe-icon";
import { PageContainer } from "@/components/marketing/page-container";

const STEPS = [
  {
    n: "1",
    icon: Plug,
    accent: "cyan" as const,
    title: "Connect",
    plain: "Hook up your AI bills and GitHub in about 15 minutes.",
    detail: "OpenAI, Anthropic, Cursor exports, and your repos. No custom agent code required.",
  },
  {
    n: "2",
    icon: Link2,
    accent: "emerald" as const,
    title: "Link",
    plain: "We match spend to shipped work automatically.",
    detail: "Each dollar gets attributed to merged PRs and commits that stuck, not rolled back.",
  },
  {
    n: "3",
    icon: BarChart3,
    accent: "amber" as const,
    title: "Report",
    plain: "See cost per win by team. Export for your board.",
    detail: "One trusted number finance can defend. PDF and CSV when leadership asks.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="product"
      className="scroll-mt-28 border-t border-[var(--border)] py-20 md:py-28"
    >
      <PageContainer>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
              How it works
            </h2>
            <p className="mt-3 max-w-lg text-[var(--text-muted)] lg:text-lg">
              Three steps. No spreadsheet archaeology.
            </p>
          </div>
          <p className="text-sm text-[var(--text-dim)] lg:max-w-xs lg:text-right">
            Live in under a day for most teams with OpenAI, Anthropic, and GitHub connected.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((step) => (
            <article
              key={step.n}
              className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-7 lg:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <LuxeIcon icon={step.icon} accent={step.accent} size="md" />
                <span className="font-mono-label text-4xl font-medium text-white/10">{step.n}</span>
              </div>
              <h3 className="mt-6 text-2xl font-medium text-white">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-white/90">{step.plain}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{step.detail}</p>
            </article>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
