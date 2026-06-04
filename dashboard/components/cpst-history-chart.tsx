"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartInsightBadge } from "@/components/chart-insight-badge";
import { useTheme } from "@/components/theme-provider";
import { type Urgency } from "@/lib/chart-insights";
import { getChartColors } from "@/lib/chart-colors";

export type CpstHistoryPoint = {
  period: string;
  cpstUsd: number;
  stableOutcomes: number;
  totalSpendUsd: number;
  contractVersion?: string | null;
};

function historyInsight(data: CpstHistoryPoint[]): {
  urgency: Urgency;
  label: string;
  detail: string;
} {
  if (data.length < 2) {
    return {
      urgency: "neutral",
      label: "Building history",
      detail: "Monthly snapshots will show long-term CPST direction.",
    };
  }
  const latest = data[data.length - 1].cpstUsd;
  const prior = data[data.length - 2].cpstUsd;
  if (prior <= 0) {
    return {
      urgency: "neutral",
      label: `CPST $${Math.round(latest)}`,
      detail: "First comparable month recorded.",
    };
  }
  const ch = ((latest - prior) / prior) * 100;
  if (ch <= -5) {
    return {
      urgency: "good",
      label: "Monthly CPST improved",
      detail: `Down ${Math.abs(Math.round(ch))}% vs prior period.`,
    };
  }
  if (ch >= 5) {
    return {
      urgency: "bad",
      label: "Monthly CPST increased",
      detail: `Up ${Math.round(ch)}% vs prior period — investigate spend or outcome volume.`,
    };
  }
  return {
    urgency: "neutral",
    label: "Monthly CPST stable",
    detail: `Change ${ch >= 0 ? "+" : ""}${Math.round(ch)}% period over period.`,
  };
}

export function CpstHistoryChart({ data }: { data: CpstHistoryPoint[] }) {
  const { theme } = useTheme();
  void theme;
  const colors = getChartColors();

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm theme-text-muted">
        No monthly snapshots yet. Run sync to record CPST history.
      </p>
    );
  }

  const insight = historyInsight(data);
  const lineColor =
    insight.urgency === "good"
      ? colors.good
      : insight.urgency === "bad"
        ? colors.bad
        : colors.line;

  const chartData = data.map((d, i) => {
    let dotColor = colors.neutral;
    if (i > 0 && data[i - 1].cpstUsd > 0) {
      if (d.cpstUsd < data[i - 1].cpstUsd * 0.95) dotColor = colors.good;
      else if (d.cpstUsd > data[i - 1].cpstUsd * 1.05) dotColor = colors.bad;
    }
    return { ...d, dotColor };
  });

  return (
    <div>
      <ChartInsightBadge
        label={insight.label}
        detail={insight.detail}
        urgency={insight.urgency}
      />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
            <XAxis dataKey="period" stroke={colors.axis} fontSize={12} />
            <YAxis
              stroke={colors.axis}
              fontSize={12}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
              }}
              labelStyle={{ color: "var(--text-muted)" }}
              formatter={(value: number, name: string) => {
                if (name === "cpstUsd") return [`$${value}`, "CPST"];
                return [value, name];
              }}
            />
            <Line
              type="monotone"
              dataKey="cpstUsd"
              name="cpstUsd"
              stroke={lineColor}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, index } = props;
                if (cx == null || cy == null || index == null) return <g />;
                const fill = chartData[index]?.dotColor ?? colors.neutral;
                return (
                  <circle cx={cx} cy={cy} r={4} fill={fill} />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
