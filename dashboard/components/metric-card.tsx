import { cn } from "@/lib/cn";
import { urgencyClasses, type Urgency } from "@/lib/chart-insights";

export function MetricCard({
  label,
  value,
  hint,
  urgency,
}: {
  label: string;
  value: string;
  hint?: string;
  urgency?: Urgency;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 theme-card",
        urgency ? urgencyClasses(urgency) : "",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide theme-text-muted">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={{ color: "var(--text)" }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs theme-text-dim">{hint}</p>
      ) : null}
    </div>
  );
}
