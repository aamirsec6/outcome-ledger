"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSignature, Loader2, ScrollText } from "lucide-react";

export type OutcomeContract = {
  id: string;
  version: string;
  status: string;
  title: string;
  summary: string;
  metricVersion?: string;
  cfoApproved?: boolean;
  approval?: {
    signerName: string;
    signerEmail?: string;
    signerTitle?: string;
    signedAt?: string;
  };
  spec?: {
    outcomeTypes?: Array<{ id: string; label: string; acceptedWhen?: string }>;
    formula?: { expression?: string; version?: string };
  };
};

export function OutcomeContractPanel({
  contract,
  draftVersions,
}: {
  contract: OutcomeContract | null;
  draftVersions: OutcomeContract[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("CFO");
  const [signerEmail, setSignerEmail] = useState("");

  const draft = draftVersions.find((v) => v.status === "draft");

  async function createDraft() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/contracts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Failed to create draft");
        return;
      }
      setMessage(`Draft v${data.contract?.version} created. Publish when ready.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/contracts/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Publish failed");
        return;
      }
      setMessage(`Contract v${data.contract?.version} is now active.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cfoApprove(id: string) {
    if (!signerName.trim()) {
      setMessage("Signer name is required for CFO approval.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/contracts/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim() || undefined,
          signerEmail: signerEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Approval failed");
        return;
      }
      setMessage("CFO sign-off recorded. Exports will include approval metadata.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!contract) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Connect the API to load your outcome contract.
      </div>
    );
  }

  const outcome = contract.spec?.outcomeTypes?.[0];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
            <div>
              <h3 className="font-medium text-white">
                {contract.title} · v{contract.version}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                {contract.status} · CPST metric v{contract.metricVersion || "1.0"}
              </p>
            </div>
          </div>
          {contract.cfoApproved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2.5 py-1 text-xs text-teal-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              CFO signed
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
              Awaiting CFO sign-off
            </span>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{contract.summary}</p>
        {outcome ? (
          <p className="mt-2 text-xs text-slate-500">
            <span className="text-slate-400">{outcome.label}:</span> {outcome.acceptedWhen}
          </p>
        ) : null}
        {contract.spec?.formula?.expression ? (
          <p className="mt-2 font-mono text-xs text-teal-400/90">
            {contract.spec.formula.expression}
          </p>
        ) : null}
        {contract.approval ? (
          <div className="mt-4 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-teal-200">
              <FileSignature className="h-4 w-4" />
              {contract.approval.signerName}
              {contract.approval.signerTitle ? ` · ${contract.approval.signerTitle}` : ""}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Signed {contract.approval.signedAt ? new Date(contract.approval.signedAt).toLocaleString() : ""}
            </p>
          </div>
        ) : null}
      </div>

      {!contract.cfoApproved && contract.status === "active" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="text-sm font-medium text-white">CFO sign-off</h4>
          <p className="mt-1 text-xs text-slate-400">
            Finance attests this is how your org measures accepted outcomes for board reporting.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="min-w-[160px] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              placeholder="Signer name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
            <input
              className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              placeholder="Title"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
            />
            <input
              className="min-w-[180px] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white"
              placeholder="Email (optional)"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => cfoApprove(contract.id)}
            className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "Record CFO approval"}
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h4 className="text-sm font-medium text-white">New contract version</h4>
        <p className="mt-1 text-xs text-slate-400">
          Changing how you define a win creates a new version. Prior versions stay in the audit trail;
          CPST history is tagged with the contract version active each month.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || Boolean(draft)}
            onClick={createDraft}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Create draft from active
          </button>
          {draft ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => publishDraft(draft.id)}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Publish draft v{draft.version}
            </button>
          ) : null}
        </div>
      </div>

      {message ? <p className="text-sm text-teal-300">{message}</p> : null}
    </div>
  );
}
