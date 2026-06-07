import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/format";

type Integration = { id: string; name: string; status: string };

type Props = {
  integrations: Integration[];
  githubConnected: boolean;
  hasTeamMappings: boolean;
  attributedSpendPct: number;
  hasLastSync: boolean;
};

export function ConnectWizard({
  integrations,
  githubConnected,
  hasTeamMappings,
  attributedSpendPct,
  hasLastSync,
}: Props) {
  const vendorConnected = integrations.some(
    (i) =>
      ["openai", "anthropic", "cursor", "claude-code"].includes(i.id) &&
      (i.status === "connected" || i.status === "csv"),
  );
  const steps = [
    {
      id: "github",
      label: "GitHub",
      done: githubConnected,
      href: "/integrations",
    },
    {
      id: "vendors",
      label: "AI spend",
      done: vendorConnected,
      href: "/integrations",
    },
    {
      id: "teams",
      label: "Teams",
      done: hasTeamMappings,
      href: "/settings?section=teams",
    },
    {
      id: "sync",
      label: "Sync",
      done: hasLastSync,
      href: "/integrations",
    },
    {
      id: "coverage",
      label: `${pct(attributedSpendPct)} tagged`,
      done: attributedSpendPct >= 80,
      href: "/settings?section=teams",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;

  if (complete) {
    return (
      <div className="rounded-lg bg-good-dim px-4 py-3 text-sm">
        <p className="theme-heading font-medium">All set</p>
        <p className="mt-1 theme-text-muted">
          View{" "}
          <Link href="/overview" className="theme-accent hover:underline">
            Overview
          </Link>{" "}
          or export from{" "}
          <Link href="/reports" className="theme-accent hover:underline">
            Reports
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <section className="theme-panel rounded-xl px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide theme-text-dim">
          Setup progress
        </h2>
        <span className="text-xs theme-text-dim">
          {doneCount}/{steps.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              step.done
                ? "border-transparent bg-good-dim theme-good"
                : "border-[var(--border)] theme-inset theme-heading hover:opacity-90",
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3 theme-text-dim" />
            )}
            {step.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
