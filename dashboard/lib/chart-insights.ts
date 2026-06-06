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
      label: "No cost per win yet",
      detail: "Connect GitHub and sync to see cost per win.",
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
      detail: `Current cost per win is $${latest < 1 ? latest.toFixed(2) : Math.round(latest)}.`,
      latestCpst: latest,
      priorCpst: null,
      changePct: null,
    };
  }

  const changePct = ((latest - prior) / prior) * 100;
  if (changePct <= -8) {
    return {
      urgency: "good",
      label: "Cost per win improving",
      detail: `Down ${Math.abs(Math.round(changePct))}% vs last week.`,
      latestCpst: latest,
      priorCpst: prior,
      changePct,
    };
  }
  if (changePct >= 8) {
    return {
      urgency: "bad",
      label: "Cost per win rising",
      detail: `Up ${Math.round(changePct)}% vs last week — worth a closer look.`,
      latestCpst: latest,
      priorCpst: prior,
      changePct,
    };
  }
  return {
    urgency: "neutral",
    label: "Cost per win stable",
    detail: `Change vs last week: ${changePct >= 0 ? "+" : ""}${Math.round(changePct)}%.`,
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
    return { urgency: "good", label: "Spend tagging on track" };
  }
  if (attributedPct >= 50) {
    return { urgency: "warn", label: "Some spend isn't tagged" };
  }
  return { urgency: "bad", label: "Most spend isn't tagged" };
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
