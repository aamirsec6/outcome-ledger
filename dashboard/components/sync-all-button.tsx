"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export function SyncAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || data.error || "Sync failed");
        return;
      }
      setMessage("Full sync completed (vendors + GitHub + revert scan).");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="font-medium text-white">Enterprise sync</h3>
      <p className="mt-1 text-sm text-slate-400">
        Pull OpenAI, Anthropic, GitHub, and run revert detection. Logged in sync
        history.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Run full sync
      </button>
      {message ? <p className="mt-2 text-sm text-teal-300">{message}</p> : null}
    </div>
  );
}
