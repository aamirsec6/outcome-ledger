"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";

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
          ? `Win definition updated (contract v${data.contract?.version ?? "?"}). Run Sync to refresh outcomes.`
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start gap-3">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white">Define a win</h3>
          <p className="mt-1 text-sm text-slate-400">
            Choose what counts as an accepted outcome for CPST. Published as a new outcome
            contract version; CFO can re-sign on the Outcome contract page.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
              winType === opt.id
                ? "border-teal-500/50 bg-teal-500/10"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <input
              type="radio"
              name="winType"
              value={opt.id}
              checked={winType === opt.id}
              onChange={() => setWinType(opt.id)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-white">{opt.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">{initial.summary}</p>

      {initial.contract ? (
        <p className="mt-2 text-xs text-slate-500">
          Active contract v{initial.contract.version}
          {initial.contract.cfoApproved ? " · CFO signed" : " · awaiting CFO sign-off"}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || winType === initial.winType}
          onClick={save}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="inline h-4 w-4 animate-spin" />
          ) : (
            "Save & publish contract"
          )}
        </button>
        {winType === "default_branch_commit" ? (
          <span className="text-xs text-amber-300/90">
            Then run Sync — ingests master/main commits (skips PR merge commits).
          </span>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-sm text-teal-300">{message}</p> : null}
    </div>
  );
}
