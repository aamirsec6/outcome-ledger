"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";

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
    <section className="theme-panel p-5">
      <div className="flex items-center gap-3">
        <Users className="theme-icon h-5 w-5 shrink-0" />
        <div>
          <h3 className="theme-heading text-base font-medium">Tag repos to teams</h3>
          <p className="mt-1 text-sm theme-text-muted">
            Each row links a GitHub repo to a team label. That team then gets credit for spend
            and merged PR wins from those repos on the Teams page.
          </p>
          <p className="mt-2 text-xs theme-text-dim">
            Example: <code className="theme-code">aamirsec6/outcome-ledger</code> →{" "}
            <code className="theme-code">platform</code>. Use{" "}
            <code className="theme-code">org/</code> to match every repo in an org.
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              className="theme-input theme-input-sm min-w-[200px] flex-1"
              placeholder="org/repo or org/"
              value={row.pattern}
              onChange={(e) => updateRow(i, "pattern", e.target.value)}
            />
            <input
              className="theme-input theme-input-sm w-32"
              placeholder="team name"
              value={row.teamId}
              onChange={(e) => updateRow(i, "teamId", e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className="theme-btn-ghost">
          Add row
        </button>
        <button type="button" onClick={save} disabled={busy} className="theme-btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </button>
      </div>
      {message ? <p className="theme-message-success mt-2">{message}</p> : null}
    </section>
  );
}
