"use client";

import { useCallback, useState } from "react";
import { FileDown, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

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
              className="theme-btn-secondary"
            >
              <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
              Generate narrative
            </button>
            <a href="/api/reports/export" className="theme-btn-secondary">
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
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                approved ? "theme-btn-primary" : "theme-btn-primary cursor-not-allowed opacity-50",
              )}
              title={approved ? "Download board pack PDF" : "Approve narrative first"}
            >
              <FileDown className="h-4 w-4" />
              PDF board pack
            </a>
          </>
        ) : (
          <p className="text-xs bg-warm-dim rounded px-2 py-1">
            Connect OUTCOME_LEDGER_API_URL for live reports
          </p>
        )}
        {report ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              approved ? "bg-good-dim" : "bg-warm-dim",
            )}
          >
            {approved ? `Approved · ${report.approvedBy}` : "Draft — needs approval"}
          </span>
        ) : null}
        {report?.model ? (
          <span className="text-xs theme-text-dim">Model: {report.model}</span>
        ) : null}
      </div>

      {live && report && !approved ? (
        <div className="theme-panel flex flex-wrap items-end gap-2 p-4">
          <label className="theme-label flex flex-col gap-1 text-xs">
            Approver name (required for PDF)
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Jane CFO"
              className="theme-input"
            />
          </label>
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            className="theme-btn-primary"
          >
            <ShieldCheck className="h-4 w-4" />
            Approve for export
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm theme-bad">{error}</p>
      ) : null}

      <pre className="theme-panel whitespace-pre-wrap p-5 text-sm leading-relaxed theme-text-muted">
        {narrative}
      </pre>
    </div>
  );
}
