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

export type CpstHistoryPoint = {
  period: string;
  cpstUsd: number;
  stableOutcomes: number;
  totalSpendUsd: number;
  contractVersion?: string | null;
};

export function CpstHistoryChart({ data }: { data: CpstHistoryPoint[] }) {
  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No monthly snapshots yet. Run sync to record CPST history.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value: number, name: string) => {
              if (name === "cpstUsd") return [`$${value}`, "CPST"];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="cpstUsd"
            name="cpstUsd"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={{ fill: "#2dd4bf", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
