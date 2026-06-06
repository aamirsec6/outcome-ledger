"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CursorConnectPanel({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [probe, setProbe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function testApi() {
    setProbe("Testing…");
    try {
      const res = await fetch("/api/jobs/cursor-probe");
      const data = await res.json();
      if (data.ok) {
        setProbe("API works — AI line tracking is available on your plan.");
      } else {
        setProbe(
          data.hint ||
            data.error ||
            "API not ready yet — estimates still run until you upgrade.",
        );
      }
    } catch {
      setProbe("Probe failed — try again after deploy.");
    }
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/connections/cursor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || data.error || "Failed to save");
        return;
      }
      setMessage("Cursor connected — run Sync to pull AI vs human line counts.");
      setKey("");
      router.refresh();
    } catch {
      setMessage("Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="theme-inset space-y-3 rounded-lg p-4">
      <div>
        <p className="text-sm font-medium theme-heading">Cursor Admin API</p>
        <p className="mt-1 text-xs theme-text-muted">
          Built for when you buy <strong>Cursor Team</strong>. Paste your Admin API key
          then — auto spend + exact AI vs human lines. Until then, CSV/MCP + estimates
          still work.
        </p>
      </div>
      {configured ? (
        <p className="text-sm theme-good">
          API key saved — run Sync to pull billing + AI line counts.
        </p>
      ) : (
        <p className="text-xs theme-text-dim">
          No key yet? Keep using CSV upload below. This slot is ready for Team plan day.
        </p>
      )}
      <input
        type="password"
        placeholder="crsr_… Admin API key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="theme-input w-full rounded-lg px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy || !key.trim()}
        className="theme-btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Saving…" : configured ? "Update key" : "Connect Cursor"}
      </button>
      {message ? <p className="text-xs theme-text-muted">{message}</p> : null}
      {configured ? (
        <button
          type="button"
          onClick={testApi}
          className="text-sm theme-accent underline"
        >
          Test Cursor API
        </button>
      ) : null}
      {probe ? <p className="text-xs theme-text-muted">{probe}</p> : null}
      <p className="text-xs theme-text-dim">
        After Team plan: cursor.com/dashboard → Settings → Admin API Keys
      </p>
    </div>
  );
}
