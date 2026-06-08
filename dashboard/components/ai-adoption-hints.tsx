import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import type { AiAdoptionDiagnostic } from "@/lib/api";

export function AiAdoptionHints({ hints }: { hints: AiAdoptionDiagnostic[] }) {
  if (!hints.length) return null;

  return (
    <ul className="space-y-2">
      {hints.map((hint) => {
        const isWarning = hint.severity === "warning";
        const Icon = isWarning ? AlertTriangle : Info;
        return (
          <li
            key={hint.id}
            className={`rounded-lg border px-4 py-3 text-sm ${
              isWarning ? "border-amber-500/25 bg-amber-500/5" : "border-[var(--border)] bg-[var(--bg-inset)]"
            }`}
          >
            <div className="flex gap-3">
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${isWarning ? "text-amber-400" : "theme-text-dim"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium theme-heading">{hint.title}</p>
                <p className="mt-1 text-xs theme-text-muted">{hint.body}</p>
                {hint.actionHref && hint.actionLabel ? (
                  <Link
                    href={hint.actionHref}
                    className="mt-2 inline-block text-xs font-medium theme-accent hover:underline"
                  >
                    {hint.actionLabel} →
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
