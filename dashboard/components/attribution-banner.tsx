import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { attributionInsight, urgencyClasses } from "@/lib/chart-insights";
import { cn } from "@/lib/cn";
import { pct } from "@/lib/format";

type Props = {
  attributedSpendPct: number;
  targetPct?: number;
  className?: string;
};

export function AttributionBanner({
  attributedSpendPct,
  targetPct = 80,
  className,
}: Props) {
  const insight = attributionInsight(attributedSpendPct);
  const Icon =
    insight.urgency === "good"
      ? CheckCircle2
      : insight.urgency === "bad"
        ? XCircle
        : AlertTriangle;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
        urgencyClasses(insight.urgency),
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium" style={{ color: "var(--text)" }}>
          {insight.label}: {pct(attributedSpendPct)}
          <span className="font-normal theme-text-muted">
            {" "}
            · target ≥{targetPct}%
          </span>
        </p>
        <p className="mt-1 theme-text-muted">
          {insight.urgency === "good"
            ? "Most of your AI spend is tied to a team — reports will look solid."
            : insight.urgency === "bad"
              ? "Most spend isn't tied to a team yet. Tag repos in Settings to fix this."
              : "Tag repos to teams in Settings so more spend shows up on the right team."}
        </p>
        {insight.urgency !== "good" ? (
          <Link
            href="/settings"
            className="mt-2 inline-block text-xs font-medium theme-accent"
          >
            Tag repos to teams →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
