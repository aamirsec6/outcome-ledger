import { cn } from "@/lib/cn";

export function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "teal" | "amber" | "slate";
}) {
  const border =
    accent === "teal"
      ? "border-teal-500/30"
      : accent === "amber"
        ? "border-amber-500/30"
        : "border-slate-800";

  return (
    <div
      className={cn(
        "rounded-xl border bg-slate-900/60 px-4 py-3",
        border,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
