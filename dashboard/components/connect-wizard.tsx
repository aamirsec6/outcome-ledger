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
      label: "Connect GitHub",
      done: githubConnected,
      href: "/integrations",
    },
    {
      id: "vendors",
      label: "Add AI spend (API or CSV)",
      done: vendorConnected,
      href: "/integrations",
    },
    {
      id: "teams",
      label: "Map repos → teams",
      done: hasTeamMappings,
      href: "/settings",
    },
    {
      id: "sync",
      label: "Run first sync",
      done: hasLastSync,
      href: "/integrations",
    },
    {
      id: "coverage",
      label: `Attribution ≥80% (now ${pct(attributedSpendPct)})`,
      done: attributedSpendPct >= 80,
      href: "/settings",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;

  if (complete) {
    return (
      <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
        <p className="font-medium text-white">Setup complete</p>
        <p className="mt-1 text-slate-400">
          Integrations, team mappings, and sync are in place. Generate a report
          on the{" "}
          <Link href="/reports" className="text-teal-400 hover:underline">
            Reports
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Connect wizard</h2>
        <span className="text-xs text-slate-500">
          {doneCount}/{steps.length} complete
        </span>
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                step.done
                  ? "text-slate-400"
                  : "bg-slate-800/60 text-white hover:bg-slate-800",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
              ) : (
                <Circle className="h-4 w-4 text-slate-600" />
              )}
              <span className="text-sm">{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
