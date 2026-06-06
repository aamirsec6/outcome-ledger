"use client";

import { useCallback, useEffect, useState } from "react";
import { usd } from "@/lib/format";

type Candidate = {
  linkId: string;
  usageEventId: string;
  outcomeEventId: string;
  allocatedUsd: number;
  confidence: number;
  method: string;
  mlProbability: number | null;
  usage: {
    source: string;
    costUsd: number;
    repo: string | null;
    periodStart: string;
    traceId: string | null;
  };
  outcome: {
    title: string | null;
    repo: string | null;
    workflowType: string | null;
    occurredAt: string;
  };
};

export function AttributionOverridePanel() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attribution/candidates", { cache: "no-store" });
      if (!res.ok) {
        setCandidates([]);
        return;
      }
      const data = await res.json();
      setCandidates(data.candidates ?? []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmLink(c: Candidate) {
    setBusyId(c.linkId);
    setMessage(null);
    try {
      const res = await fetch("/api/attribution/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usageEventId: c.usageEventId,
          outcomeEventId: c.outcomeEventId,
          reason: "Confirmed via dashboard review",
          allocatedUsd: c.allocatedUsd,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || err.error || "Override failed");
        return;
      }
      setMessage("Link confirmed — will improve learned linker on next sync.");
      setCandidates((prev) => prev.filter((x) => x.linkId !== c.linkId));
    } catch {
      setMessage("Override request failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="theme-panel rounded-xl p-5 text-sm theme-text-muted">
        Loading attribution review queue…
      </section>
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  return (
    <section className="theme-panel space-y-3 rounded-xl p-5">
      <div>
        <h2 className="text-sm font-medium" style={{ color: "var(--text)" }}>
          Review low-confidence links
        </h2>
        <p className="text-xs theme-text-muted">
          Confirming links trains the Phase 2 learned linker on your next sync.
        </p>
      </div>

      {message ? (
        <p className="text-xs theme-text-muted">{message}</p>
      ) : null}

      <div className="space-y-2">
        {candidates.map((c) => (
          <div
            key={c.linkId}
            className="theme-card flex flex-col gap-2 rounded-lg px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium" style={{ color: "var(--text)" }}>
                {c.outcome.title || "Outcome"} · {c.outcome.repo || "no repo"}
              </p>
              <p className="theme-text-dim">
                {c.usage.source} {usd(c.usage.costUsd)} · conf{" "}
                {Math.round(c.confidence * 100)}%
                {c.mlProbability != null ? ` · ML ${Math.round(c.mlProbability * 100)}%` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === c.linkId}
              onClick={() => confirmLink(c)}
              className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {busyId === c.linkId ? "Saving…" : "Confirm link"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
