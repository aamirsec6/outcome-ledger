import {
  BarChart3,
  Eye,
  FileSignature,
  GitBranch,
  Link2,
  LineChart,
  Mail,
  MessageSquare,
  ShieldCheck,
  Slack,
  Zap,
} from "lucide-react";
import { InteractiveIconCard } from "./interactive-icon-card";
import { PageContainer } from "@/components/marketing/page-container";

const CONTROLS = [
  {
    title: "Cost per win, not cost per token",
    desc: "Fully loaded spend (including failed runs) divided by wins that stuck. The metric your board actually cares about.",
    icon: BarChart3,
    accent: "emerald" as const,
  },
  {
    title: "Honest wins only",
    desc: "Rollbacks don't count. A win means work that stayed shipped for 7 days — not code that got undone.",
    icon: GitBranch,
    accent: "cyan" as const,
  },
  {
    title: "CFO-signed definitions",
    desc: "Your finance lead signs off on what counts as a win. That definition travels with every board export.",
    icon: FileSignature,
    accent: "amber" as const,
  },
  {
    title: "Slack alerts when it matters",
    desc: "CPST spike? Budget burn? Inbox needs review? Get notified where your team already works.",
    icon: Slack,
    accent: "emerald" as const,
  },
  {
    title: "Weekly digest to finance",
    desc: "Auto-emailed every Monday. Spend, wins, CPST trend, anomalies. No login required.",
    icon: Mail,
    accent: "cyan" as const,
  },
  {
    title: "GitHub PR cost comments",
    desc: "Engineers see attributed AI cost right on the PR. Builds awareness without changing workflows.",
    icon: MessageSquare,
    accent: "amber" as const,
  },
  {
    title: "Full audit trail",
    desc: "Every sync logged. Every number traceable back to a vendor bill and a definition of win.",
    icon: Eye,
    accent: "emerald" as const,
  },
  {
    title: "Team-level attribution",
    desc: "Map repos to squads. See which teams ship efficiently with AI and which burn budget.",
    icon: Link2,
    accent: "cyan" as const,
  },
  {
    title: "Trends over time",
    desc: "Monthly snapshots show CPST going up or down. Know when you're improving, not just spending more.",
    icon: LineChart,
    accent: "emerald" as const,
  },
  {
    title: "Board PDF in 5 minutes",
    desc: "Export a board-ready PDF with methodology appendix. No spreadsheet archaeology.",
    icon: ShieldCheck,
    accent: "amber" as const,
  },
  {
    title: "Real-time webhooks",
    desc: "GitHub App integration means outcomes are ingested the moment a PR merges. No polling delays.",
    icon: Zap,
    accent: "emerald" as const,
  },
  {
    title: "Connects to your stack",
    desc: "OpenAI, Anthropic, Cursor, GitHub, Langfuse. Plug in what you already use. No code changes.",
    icon: BarChart3,
    accent: "cyan" as const,
  },
];

export function ControlSection() {
  return (
    <section className="border-t border-[var(--border)] py-20 md:py-28">
      <PageContainer>
        <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
          Everything you need. Nothing you don't.
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--text-muted)] lg:text-lg">
          Every feature maps to a real budget conversation. If it doesn't help you save, defend,
          or reallocate AI spend — we don't build it.
        </p>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {CONTROLS.map((c) => (
            <article
              key={c.title}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 lg:p-7 text-left transition hover:border-[var(--border-strong)]"
            >
              <InteractiveIconCard icon={c.icon} accent={c.accent} />
              <h3 className="font-medium text-lg text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{c.desc}</p>
            </article>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
