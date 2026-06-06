import {
  BarChart3,
  Eye,
  FileSignature,
  GitBranch,
  Link2,
  LineChart,
} from "lucide-react";
import { InteractiveIconCard } from "./interactive-icon-card";
import { PageContainer } from "@/components/marketing/page-container";

const CONTROLS = [
  {
    title: "Spend linked to wins",
    desc: "See which dollars attached to which shipped work, and what is still unassigned.",
    icon: Link2,
    accent: "cyan" as const,
  },
  {
    title: "Full audit trail",
    desc: "Every sync logged. Every number traceable back to a vendor bill and a definition of win.",
    icon: Eye,
    accent: "emerald" as const,
  },
  {
    title: "Signed definitions",
    desc: "Your CFO agrees what counts as a win. That definition travels with every board export.",
    icon: FileSignature,
    accent: "amber" as const,
  },
  {
    title: "Honest wins only",
    desc: "Rollbacks do not count. A win means work that stayed shipped, not code that got undone.",
    icon: GitBranch,
    accent: "cyan" as const,
  },
  {
    title: "Connects to your stack",
    desc: "OpenAI, Anthropic, GitHub, Cursor. Plug in what you already use.",
    icon: BarChart3,
    accent: "emerald" as const,
  },
  {
    title: "Trends over time",
    desc: "Watch cost per win week over week. Know when you are improving, not just spending more.",
    icon: LineChart,
    accent: "emerald" as const,
  },
];

export function ControlSection() {
  return (
    <section className="border-t border-[var(--border)] py-20 md:py-28">
      <PageContainer>
        <h2 className="text-3xl font-medium tracking-tight text-white md:text-4xl">
          What you get
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--text-muted)] lg:text-lg">
          Everything needed to answer &ldquo;was the AI budget worth it?&rdquo; without building
          spreadsheets or renegotiating definitions in every board meeting.
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
