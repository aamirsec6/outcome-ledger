"use client";

import { useCallback, useState } from "react";
import { FileDown, RefreshCw, ShieldCheck } from "lucide-react";

type Report = {
  id: string;
  status: string;
  narrative: string;
  model?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
};

type Props = {
  live: boolean;
  initialReport: Report | null;
  fallbackMemo: string;
};

export function ReportsPanel({ live, initialReport, fallbackMemo }: Props) {
  const [report, setReport] = useState<Report | null>(initialReport);
  const [signerName, setSignerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const narrative = report?.narrative ?? fallbackMemo;
  const approved = report?.status === "approved";

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/executive", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Generate failed");
      setReport(data.report ?? (data.id ? data : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const approve = useCallback(async () => {
    if (!report?.id || !signerName.trim()) {
      setError("Enter your name to approve");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/executive/${report.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Approve failed");
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }, [report?.id, signerName]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {live ? (
          <>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              Generate narrative
            </button>
            <a
              href="/api/reports/export"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <FileDown className="h-4 w-4" />
              CSV
            </a>
            <a
              href={approved ? "/api/reports/export/pdf" : undefined}
              onClick={(e) => {
                if (!approved) {
                  e.preventDefault();
                  setError("Approve the narrative before PDF export");
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                approved
                  ? "bg-teal-600 text-white hover:bg-teal-500"
                  : "cursor-not-allowed bg-teal-600/40 text-white/70"
              }`}
              title={approved ? "Download board pack PDF" : "Approve narrative first"}
            >
              <FileDown className="h-4 w-4" />
              PDF board pack
            </a>
          </>
        ) : (
          <p className="text-xs text-amber-400">
            Connect OUTCOME_LEDGER_API_URL for live reports
          </p>
        )}
        {report ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              approved
                ? "bg-teal-500/15 text-teal-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {approved ? `Approved · ${report.approvedBy}` : "Draft — needs approval"}
          </span>
        ) : null}
        {report?.model ? (
          <span className="text-xs text-slate-500">Model: {report.model}</span>
        ) : null}
      </div>

      {live && report && !approved ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Approver name (required for PDF)
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Jane CFO"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            Approve for export
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-amber-400">{error}</p>
      ) : null}

      <pre className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-relaxed text-slate-300">
        {narrative}
      </pre>
    </div>
  );
}
