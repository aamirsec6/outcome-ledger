"use client";

/** Read CSS variables for Recharts (client only). */
export function getChartColors() {
  if (typeof document === "undefined") {
    return {
      grid: "#334155",
      axis: "#71717a",
      tooltipBg: "#161618",
      tooltipBorder: "rgba(255,255,255,0.1)",
      good: "#22c55e",
      bad: "#ef4444",
      neutral: "#34d399",
      line: "#34d399",
    };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    grid: s.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.06)",
    axis: s.getPropertyValue("--chart-axis").trim() || "#71717a",
    tooltipBg: s.getPropertyValue("--chart-tooltip-bg").trim() || "#161618",
    tooltipBorder:
      s.getPropertyValue("--chart-tooltip-border").trim() ||
      "rgba(255,255,255,0.1)",
    good: s.getPropertyValue("--good").trim() || "#22c55e",
    bad: s.getPropertyValue("--bad").trim() || "#ef4444",
    neutral: s.getPropertyValue("--accent").trim() || "#34d399",
    line: s.getPropertyValue("--accent").trim() || "#34d399",
  };
}
