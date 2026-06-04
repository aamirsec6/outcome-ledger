import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { urgencyClasses, type Urgency } from "@/lib/chart-insights";
import { cn } from "@/lib/cn";

export function ChartInsightBadge({
  label,
  detail,
  urgency,
}: {
  label: string;
  detail: string;
  urgency: Urgency;
}) {
  const Icon =
    urgency === "good"
      ? TrendingDown
      : urgency === "bad"
        ? TrendingUp
        : Minus;

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm",
        urgencyClasses(urgency),
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium" style={{ color: "var(--text)" }}>
          {label}
        </p>
        <p className="mt-0.5 text-xs theme-text-muted">{detail}</p>
      </div>
    </div>
  );
}
