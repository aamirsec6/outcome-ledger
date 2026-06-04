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
      <div className="theme-panel p-4 text-sm theme-text-muted">
        Connect the API to load your outcome contract.
      </div>
    );
  }

  const outcome = contract.spec?.outcomeTypes?.[0];

  return (
    <div className="space-y-4">
      <section className="theme-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ScrollText className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="theme-heading text-base font-medium">
                {contract.title} · v{contract.version}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-wide theme-text-dim">
                {contract.status} · CPST metric v{contract.metricVersion || "1.0"}
              </p>
            </div>
          </div>
          {contract.cfoApproved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-good-dim px-2.5 py-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              CFO signed
            </span>
          ) : (
            <span className="rounded-full bg-warm-dim px-2.5 py-1 text-xs">
              Awaiting CFO sign-off
            </span>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed theme-text-muted">{contract.summary}</p>
        {outcome ? (
          <p className="mt-2 text-xs theme-text-dim">
            <span className="theme-text-muted">{outcome.label}:</span> {outcome.acceptedWhen}
          </p>
        ) : null}
        {contract.spec?.formula?.expression ? (
          <p className="theme-accent mt-2 font-mono text-xs">{contract.spec.formula.expression}</p>
        ) : null}
        {contract.approval ? (
          <div className="bg-accent-dim mt-4 rounded-lg p-3 text-sm">
            <p className="theme-heading flex items-center gap-2 font-medium">
              <FileSignature className="h-4 w-4" />
              {contract.approval.signerName}
              {contract.approval.signerTitle ? ` · ${contract.approval.signerTitle}` : ""}
            </p>
            <p className="mt-1 text-xs theme-text-dim">
              Signed {contract.approval.signedAt ? new Date(contract.approval.signedAt).toLocaleString() : ""}
            </p>
          </div>
        ) : null}
      </section>

      {!contract.cfoApproved && contract.status === "active" ? (
        <section className="theme-panel p-5">
          <h4 className="theme-heading text-sm font-medium">CFO sign-off</h4>
          <p className="mt-1 text-xs theme-text-muted">
            Finance attests this is how your org measures accepted outcomes for board reporting.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="theme-input theme-input-sm min-w-[160px] flex-1"
              placeholder="Signer name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
            <input
              className="theme-input theme-input-sm w-28"
              placeholder="Title"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
            />
            <input
              className="theme-input theme-input-sm min-w-[180px] flex-1"
              placeholder="Email (optional)"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => cfoApprove(contract.id)}
            className="theme-btn-primary mt-3"
          >
            {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "Record CFO approval"}
          </button>
        </section>
      ) : null}

      <section className="theme-panel p-5">
        <h4 className="theme-heading text-sm font-medium">New contract version</h4>
        <p className="mt-1 text-xs theme-text-muted">
          Changing how you define a win creates a new version. Prior versions stay in the audit trail;
          CPST history is tagged with the contract version active each month.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || Boolean(draft)}
            onClick={createDraft}
            className="theme-btn-ghost"
          >
            Create draft from active
          </button>
          {draft ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => publishDraft(draft.id)}
              className="theme-btn-secondary"
            >
              Publish draft v{draft.version}
            </button>
          ) : null}
        </div>
      </section>

      {message ? <p className="theme-message-success text-sm">{message}</p> : null}
    </div>
  );
}
