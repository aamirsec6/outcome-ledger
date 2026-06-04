import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
  const ok = attributedSpendPct >= targetPct;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        ok
          ? "border-teal-500/30 bg-teal-500/10 text-teal-100"
          : "border-amber-500/30 bg-amber-500/10 text-amber-100",
        className,
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white">
          Attributed spend: {pct(attributedSpendPct)}
          <span className="font-normal text-slate-400">
            {" "}
            · target ≥{targetPct}%
          </span>
        </p>
        <p className="mt-1 text-slate-400">
          {ok
            ? "Spend is sufficiently tagged to teams for board-ready CPST."
            : "Map repos to teams and connect vendors so unattributed spend drops below 20%."}
        </p>
        {!ok ? (
          <Link
            href="/settings"
            className="mt-2 inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
          >
            Team mappings →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
