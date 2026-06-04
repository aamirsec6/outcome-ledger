"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartInsightBadge } from "@/components/chart-insight-badge";
import { useTheme } from "@/components/theme-provider";
import { cpstTrendInsight } from "@/lib/chart-insights";
import { getChartColors } from "@/lib/chart-colors";

export function CpstChart({
  data,
}: {
  data: { week: string; spend: number; outcomes: number }[];
}) {
  const { theme } = useTheme();
  void theme;
  const colors = getChartColors();

  const insight = cpstTrendInsight(data);

  const chartData = data.map((d, i, arr) => {
    const cpst =
      d.outcomes > 0 ? Math.round((d.spend / d.outcomes) * 100) / 100 : 0;
    let dotColor = colors.neutral;
    if (i > 0 && arr[i - 1].outcomes > 0) {
      const prev =
        Math.round((arr[i - 1].spend / arr[i - 1].outcomes) * 100) / 100;
      if (cpst < prev * 0.92) dotColor = colors.good;
      else if (cpst > prev * 1.08) dotColor = colors.bad;
    }
    return { week: d.week, cpst, dotColor, outcomes: d.outcomes };
  });

  const withCpst = chartData.filter((p) => p.outcomes > 0 && p.cpst > 0);
  const avgCpst =
    withCpst.length > 0
      ? Math.round(
          (withCpst.reduce((s, p) => s + p.cpst, 0) / withCpst.length) * 100,
        ) / 100
      : chartData.some((p) => p.outcomes > 0)
        ? Math.round(
            (chartData
              .filter((p) => p.outcomes > 0)
              .reduce((s, p) => s + p.cpst, 0) /
              chartData.filter((p) => p.outcomes > 0).length) *
              100,
          ) / 100
        : 0;

  const lineColor =
    insight.urgency === "good"
      ? colors.good
      : insight.urgency === "bad"
        ? colors.bad
        : colors.line;

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
            <XAxis dataKey="week" stroke={colors.axis} fontSize={12} />
            <YAxis
              stroke={colors.axis}
              fontSize={12}
              tickFormatter={(v) =>
                v < 1 ? `$${v.toFixed(2)}` : v < 100 ? `$${v.toFixed(0)}` : `$${v}`
              }
            />
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 8,
                color: "var(--text)",
              }}
              formatter={(value: number) => [
                value < 1 ? `$${value.toFixed(2)}` : `$${value}`,
                "CPST",
              ]}
              labelStyle={{ color: "var(--text-muted)" }}
            />
            {avgCpst > 0 ? (
              <ReferenceLine
                y={avgCpst}
                stroke={colors.axis}
                strokeDasharray="4 4"
                label={{
                  value: `avg $${avgCpst}`,
                  position: "insideTopRight",
                  fill: colors.axis,
                  fontSize: 10,
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="cpst"
              name="CPST"
              stroke={lineColor}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, index } = props;
                if (cx == null || cy == null || index == null) return <g />;
                const fill =
                  chartData[index]?.dotColor ?? colors.neutral;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={fill}
                    stroke={fill}
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] theme-text-dim">
        Green dot = CPST down vs prior week · Red = rising · Lower CPST is better
      </p>
    </div>
  );
}
