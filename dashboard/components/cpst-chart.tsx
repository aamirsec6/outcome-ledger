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

export function CpstChart({
  data,
}: {
  data: { week: string; spend: number; outcomes: number }[];
}) {
  const chartData = data.map((d) => ({
    week: d.week,
    cpst: d.outcomes > 0 ? Math.round(d.spend / d.outcomes) : 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Line
            type="monotone"
            dataKey="cpst"
            name="CPST"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={{ fill: "#2dd4bf", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
