"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

const TEMPLATE = `date,cost_usd,source,team_id
2026-06-02,23.60,cursor,eng`;

export function SpendCsvUpload({
  source,
  label,
  hint,
}: {
  source: string;
  label: string;
  hint: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setMessage("Choose a CSV file.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("source", source);

      const res = await fetch("/api/imports/usage-csv", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail?.error || data.error || data.detail || "Import failed");
        return;
      }
      setMessage(`Imported ${data.inserted ?? 0} row(s). Refreshing…`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="theme-panel p-5">
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5" style={{ color: "var(--warm)" }} />
        <h3 className="theme-heading text-base font-medium">{label}</h3>
      </div>
      <p className="mt-1 text-sm theme-text-muted">{hint}</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="theme-file-input block w-full"
        />
        <details className="text-xs theme-text-dim">
          <summary className="cursor-pointer theme-text-muted">CSV format</summary>
          <pre className="theme-pre">{TEMPLATE}</pre>
        </details>
        <button type="submit" disabled={busy} className="theme-btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Upload spend CSV
        </button>
        {message ? <p className="theme-message-success">{message}</p> : null}
      </form>
    </section>
  );
}
