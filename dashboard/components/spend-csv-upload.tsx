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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-amber-400" />
        <h3 className="font-medium text-white">{label}</h3>
      </div>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="block w-full text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:text-slate-200"
        />
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer text-slate-400">CSV format</summary>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-slate-400">
            {TEMPLATE}
          </pre>
        </details>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Upload spend CSV
        </button>
        {message ? <p className="text-sm text-teal-300">{message}</p> : null}
      </form>
    </div>
  );
}
