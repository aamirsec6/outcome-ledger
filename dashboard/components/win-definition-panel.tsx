"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";
import { cn } from "@/lib/cn";

export type WinOption = {
  id: string;
  label: string;
  description: string;
};

export type OutcomeWinSettings = {
  winType: string;
  stableDays: number;
  summary: string;
  options: WinOption[];
  contract?: { version?: string; cfoApproved?: boolean } | null;
};

export function WinDefinitionPanel({ initial }: { initial: OutcomeWinSettings }) {
  const router = useRouter();
  const [winType, setWinType] = useState(initial.winType);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/outcome-win", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winType, actor: "dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || data.error || "Save failed");
        return;
      }
      setMessage(
        data.winType === winType
          ? `Win rules updated. Run Sync to refresh your numbers.`
          : "Saved.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const options =
    initial.options.length > 0
      ? initial.options
      : [
          {
            id: "pr_merged_stable",
            label: "Merged pull request",
            description: "PRs merged to default branch.",
          },
          {
            id: "default_branch_commit",
            label: "Default branch commit",
            description: "Commits on master/main (direct ship).",
          },
        ];

  return (
    <section className="theme-panel p-5">
      <div className="flex items-start gap-3">
        <Target className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="theme-heading text-base font-medium">What counts as a win</h3>
          <p className="mt-1 text-sm theme-text-muted">
            Pick how we measure shipped work. Changes apply after you sync.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={cn(
              "theme-option flex cursor-pointer gap-3 p-3",
              winType === opt.id && "theme-option-selected",
            )}
          >
            <input
              type="radio"
              name="winType"
              value={opt.id}
              checked={winType === opt.id}
              onChange={() => setWinType(opt.id)}
              className="mt-1 accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium theme-heading">{opt.label}</p>
              <p className="mt-0.5 text-xs theme-text-muted">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {initial.summary ? (
        <p className="mt-3 text-xs leading-relaxed theme-text-muted">{initial.summary}</p>
      ) : null}

      {initial.contract ? (
        <p className="mt-2 text-xs theme-text-dim">
          Rule set v{initial.contract.version}
          {initial.contract.cfoApproved ? " · Signed off" : " · Awaiting sign-off"}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || winType === initial.winType}
          onClick={save}
          className="theme-btn-primary"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save win rules"
          )}
        </button>
        {winType === "default_branch_commit" ? (
          <span className="text-xs bg-warm-dim rounded px-2 py-1">
            Then run Sync to pick up new commits.
          </span>
        ) : null}
      </div>

      {message ? <p className="theme-message-success mt-3">{message}</p> : null}
    </section>
  );
}
