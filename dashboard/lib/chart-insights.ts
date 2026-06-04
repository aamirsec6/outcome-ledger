export type Urgency = "good" | "bad" | "neutral" | "warn";

export function cpstTrendInsight(
  data: { week: string; spend: number; outcomes: number }[],
): {
  urgency: Urgency;
  label: string;
  detail: string;
  latestCpst: number;
  priorCpst: number | null;
  changePct: number | null;
} {
  const points = data
    .map((d) => ({
      cpst: d.outcomes > 0 ? d.spend / d.outcomes : 0,
      outcomes: d.outcomes,
    }))
    .filter((p) => p.outcomes > 0);

  if (points.length === 0) {
    return {
      urgency: "neutral",
      label: "No CPST yet",
      detail: "Add outcomes via GitHub sync to see cost per win.",
      latestCpst: 0,
      priorCpst: null,
      changePct: null,
    };
  }

  const latest = points[points.length - 1].cpst;
  const prior = points.length > 1 ? points[points.length - 2].cpst : null;

  if (prior == null || prior === 0) {
    return {
      urgency: "neutral",
      label: "Baseline week",
      detail: `Current CPST is $${latest < 1 ? latest.toFixed(2) : Math.round(latest)} per outcome.`,
      latestCpst: latest,
      priorCpst: null,
      changePct: null,
    };
  }

  const changePct = ((latest - prior) / prior) * 100;
  if (changePct <= -8) {
    return {
      urgency: "good",
      label: "CPST improving",
      detail: `Down ${Math.abs(Math.round(changePct))}% vs prior week — cost per win is falling.`,
      latestCpst: latest,
      priorCpst: prior,
      changePct,
    };
  }
  if (changePct >= 8) {
    return {
      urgency: "bad",
      label: "CPST rising",
      detail: `Up ${Math.round(changePct)}% vs prior week — review retries and review load.`,
      latestCpst: latest,
      priorCpst: prior,
      changePct,
    };
  }
  return {
    urgency: "neutral",
    label: "CPST stable",
    detail: `Week-over-week change ${changePct >= 0 ? "+" : ""}${Math.round(changePct)}%.`,
    latestCpst: latest,
    priorCpst: prior,
    changePct,
  };
}

export function attributionInsight(attributedPct: number): {
  urgency: Urgency;
  label: string;
} {
  if (attributedPct >= 80) {
    return { urgency: "good", label: "Board-ready attribution" };
  }
  if (attributedPct >= 50) {
    return { urgency: "warn", label: "Attribution needs work" };
  }
  return { urgency: "bad", label: "Low attribution — fix mappings" };
}

export function urgencyClasses(urgency: Urgency): string {
  switch (urgency) {
    case "good":
      return "bg-good-dim theme-good";
    case "bad":
      return "bg-bad-dim theme-bad";
    case "warn":
      return "bg-warm-dim";
    default:
      return "bg-accent-dim theme-text-muted";
  }
}
