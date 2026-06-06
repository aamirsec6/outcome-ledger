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
        const msg = data.detail || data.error || "Sync failed";
        setMessage(
          typeof msg === "string" && msg.includes("Clerk session")
            ? `${msg} Try signing out and back in.`
            : msg,
        );
        return;
      }
      const gh = data.results?.github || data.github;
      const perRepo = gh?.perRepo as Record<string, { inserted?: number; mergedPrs?: number; commits?: number }> | undefined;
      let detail = "Sync finished — spend and GitHub data updated.";
      if (perRepo && Object.keys(perRepo).length > 0) {
        const lines = Object.entries(perRepo).map(([repo, s]) => {
          const n = s.inserted ?? s.mergedPrs ?? s.commits ?? 0;
          return `${repo}: ${n} new`;
        });
        detail += ` GitHub — ${lines.join("; ")}.`;
      } else if (gh?.repos?.length) {
        detail += ` GitHub repos: ${(gh.repos as string[]).join(", ")}.`;
      }
      setMessage(detail);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="theme-panel p-5">
      <h3 className="theme-heading text-base font-medium">Sync data</h3>
      <p className="mt-1 text-sm theme-text-muted">
        Refresh spend from connected tools and shipped work from GitHub.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="theme-btn-primary mt-3"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Sync now
      </button>
      {message ? <p className="theme-message mt-2">{message}</p> : null}
    </section>
  );
}
