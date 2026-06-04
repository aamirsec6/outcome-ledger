"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function TeamMappingsPanel({
  initialMappings,
}: {
  initialMappings: { pattern: string; teamId: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(
    initialMappings.length
      ? initialMappings
      : [{ pattern: "aamirsec6/agent-money", teamId: "eng" }],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateRow(i: number, field: "pattern" | "teamId", value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { pattern: "", teamId: "" }]);
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/team-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: rows.filter((r) => r.pattern && r.teamId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || data.error || "Save failed");
        return;
      }
      setMessage("Team mappings saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="font-medium text-white">Team mapping</h3>
      <p className="mt-1 text-sm text-slate-400">
        Map GitHub repos to team IDs for attribution (longest pattern match wins).
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              placeholder="org/repo or org/"
              value={row.pattern}
              onChange={(e) => updateRow(i, "pattern", e.target.value)}
            />
            <input
              className="w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              placeholder="team id"
              value={row.teamId}
              onChange={(e) => updateRow(i, "teamId", e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300"
        >
          Add row
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save mappings
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-teal-300">{message}</p> : null}
    </div>
  );
}
