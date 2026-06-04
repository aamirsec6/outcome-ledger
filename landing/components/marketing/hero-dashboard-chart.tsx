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

const SPEND_TREND = [
  { week: "W1", spend: 214_000, outcomes: 42 },
  { week: "W2", spend: 198_400, outcomes: 48 },
  { week: "W3", spend: 176_200, outcomes: 55 },
  { week: "W4", spend: 158_600, outcomes: 61 },
  { week: "W5", spend: 142_800, outcomes: 68 },
];

const CHART_COLORS = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#71717a",
  good: "#22c55e",
  bad: "#ef4444",
  line: "#34d399",
  tooltipBg: "#161618",
  tooltipBorder: "rgba(255,255,255,0.1)",
};

function cpstPoint(spend: number, outcomes: number) {
  return outcomes > 0 ? Math.round(spend / outcomes) : 0;
}

const chartData = SPEND_TREND.map((d, i, arr) => {
  const cpst = cpstPoint(d.spend, d.outcomes);
  let dotColor = CHART_COLORS.line;
  if (i > 0) {
    const prev = cpstPoint(arr[i - 1].spend, arr[i - 1].outcomes);
    if (cpst < prev * 0.92) dotColor = CHART_COLORS.good;
    else if (cpst > prev * 1.08) dotColor = CHART_COLORS.bad;
  }
  return { week: d.week, cpst, dotColor };
});

const avgCpst = Math.round(
  chartData.reduce((s, p) => s + p.cpst, 0) / chartData.length,
);

export function HeroDashboardChart() {
  return (
    <div className="h-36 w-full sm:h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            stroke={CHART_COLORS.axis}
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke={CHART_COLORS.axis}
            fontSize={10}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{
              background: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 11,
              color: "#f4f4f5",
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, "CPST"]}
          />
          <ReferenceLine
            y={avgCpst}
            stroke={CHART_COLORS.axis}
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="cpst"
            stroke={CHART_COLORS.good}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, index } = props;
              if (cx == null || cy == null || index == null) return <g />;
              const fill = chartData[index]?.dotColor ?? CHART_COLORS.line;
              return <circle cx={cx} cy={cy} r={3.5} fill={fill} />;
            }}
            isAnimationActive
            animationDuration={1200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
