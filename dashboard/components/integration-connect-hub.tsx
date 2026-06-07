"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Laptop, Upload } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  INTEGRATION_CATALOG,
  type IntegrationId,
  type IntegrationMeta,
} from "@/lib/integrations-catalog";

type IntegrationRow = {
  id: string;
  name: string;
  status: "connected" | "csv" | "pending";
};

type Props = {
  integrations: IntegrationRow[];
  panels: Partial<Record<IntegrationId, React.ReactNode>>;
};

const statusLabel = {
  connected: "Connected",
  csv: "CSV",
  pending: "Connect",
} as const;

function statusIcon(status: IntegrationRow["status"]) {
  if (status === "connected") {
    return <CheckCircle2 className="h-3.5 w-3.5 theme-good" />;
  }
  if (status === "csv") {
    return <Upload className="h-3.5 w-3.5" style={{ color: "var(--warm)" }} />;
  }
  return <Circle className="h-3.5 w-3.5 theme-text-dim" />;
}

function pickDefault(
  catalog: IntegrationMeta[],
  statusById: Map<string, IntegrationRow["status"]>,
): IntegrationId {
  const pending = catalog.find((c) => statusById.get(c.id) === "pending");
  if (pending) return pending.id;
  const csv = catalog.find((c) => statusById.get(c.id) === "csv");
  if (csv) return csv.id;
  return catalog[0]?.id ?? "github";
}

export function IntegrationConnectHub({ integrations, panels }: Props) {
  const statusById = useMemo(
    () => new Map(integrations.map((i) => [i.id, i.status])),
    [integrations],
  );

  const catalog = useMemo(() => {
    const ids = new Set(integrations.map((i) => i.id));
    const known = INTEGRATION_CATALOG.filter((c) => ids.has(c.id));
    for (const row of integrations) {
      if (!known.some((c) => c.id === row.id)) {
        known.push({
          id: row.id as IntegrationId,
          name: row.name,
          tagline: "Integration",
          icon: Circle,
          accent: "var(--text-muted)",
          category: "spend",
        });
      }
    }
    const order = ["github", "cursor", "openai", "anthropic", "claude-code", "copilot", "langfuse"];
    return known.sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id) || a.name.localeCompare(b.name),
    );
  }, [integrations]);

  const [selected, setSelected] = useState<IntegrationId>(() =>
    pickDefault(catalog, statusById),
  );

  const active = catalog.find((c) => c.id === selected) ?? catalog[0];
  const activeStatus = statusById.get(selected) ?? "pending";
  const panel = panels[selected];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {catalog.map((item) => {
          const Icon = item.icon;
          const status = statusById.get(item.id) ?? "pending";
          const isActive = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={cn(
                "theme-panel flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all",
                isActive
                  ? "ring-2 ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]"
                  : "hover:bg-[var(--bg-hover)]",
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: `color-mix(in srgb, ${item.accent} 12%, transparent)`,
                    color: item.accent,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    status === "connected" && "bg-good-dim theme-good",
                    status === "csv" && "bg-warm-dim",
                    status === "pending" && "theme-badge-neutral",
                  )}
                >
                  {statusIcon(status)}
                  {statusLabel[status]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium theme-heading">{item.name}</p>
                <p className="mt-0.5 text-xs theme-text-dim">{item.tagline}</p>
              </div>
            </button>
          );
        })}

        <Link
          href="/settings?section=developer"
          className="theme-panel flex flex-col items-start gap-3 rounded-xl p-4 transition-colors hover:bg-[var(--bg-hover)]"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium theme-heading">Local MCP</p>
            <p className="mt-0.5 text-xs theme-text-dim">Sync from your machine</p>
          </div>
        </Link>
      </div>

      {active ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                background: `color-mix(in srgb, ${active.accent} 12%, transparent)`,
                color: active.accent,
              }}
            >
              <active.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium theme-heading">{active.name}</h2>
              <p className="text-xs theme-text-dim">
                {active.tagline}
                {" · "}
                <span className="capitalize">{statusLabel[activeStatus].toLowerCase()}</span>
              </p>
            </div>
          </div>
          {panel ?? (
            <p className="rounded-lg theme-inset px-4 py-3 text-sm theme-text-muted">
              Setup for {active.name} is not available in the dashboard yet. Use CSV
              upload or the local MCP agent.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
