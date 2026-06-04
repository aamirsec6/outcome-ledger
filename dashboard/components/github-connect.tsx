"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, Loader2 } from "lucide-react";

type Repo = { full_name: string; private?: boolean };

export function GitHubConnectPanel({
  connectUrl,
  status,
  availableRepos,
}: {
  connectUrl: string;
  status: {
    connected: boolean;
    login?: string;
    repos?: string[];
    oauth_configured?: boolean;
  };
  availableRepos: Repo[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(status.repos || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manualRepo, setManualRepo] = useState("");

  const repoOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of availableRepos) {
      if (r.full_name) names.add(r.full_name);
    }
    for (const r of status.repos || []) names.add(r);
    return Array.from(names).sort();
  }, [availableRepos, status.repos]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return repoOptions;
    return repoOptions.filter((n) => n.toLowerCase().includes(q));
  }, [repoOptions, search]);

  async function addManualRepo() {
    const name = manualRepo.trim();
    if (!name.includes("/")) {
      setMessage("Use owner/repo, e.g. aamirsec6/outcome-ledger");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/github/repos/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || data.error || "Cannot access repo");
        return;
      }
      const full = data.repo?.full_name || name;
      setSelected((prev) => (prev.includes(full) ? prev : [...prev, full]));
      setManualRepo("");
      setMessage(`Added ${full}. Save & sync when ready.`);
    } finally {
      setBusy(false);
    }
  }

  async function saveAndSync() {
    if (selected.length === 0) {
      setMessage("Pick at least one repository.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const saveRes = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: selected }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setMessage(saveData.detail || saveData.error || "Failed to save repos");
        return;
      }
      const syncRes = await fetch("/api/github/sync", { method: "POST" });
      const syncData = await syncRes.json();
      if (!syncRes.ok) {
        setMessage(syncData.detail || syncData.error || "Sync failed");
        return;
      }
      const perRepo = syncData.github?.perRepo || syncData.perRepo;
      const parts = perRepo
        ? Object.entries(perRepo as Record<string, { inserted?: number; mergedPrs?: number; commits?: number }>)
            .map(([r, s]) => `${r.split("/").pop()}: ${s.inserted ?? s.mergedPrs ?? s.commits ?? 0}`)
            .join(", ")
        : null;
      const n = syncData.github?.inserted ?? syncData.inserted ?? 0;
      setMessage(
        parts
          ? `Synced ${n} outcomes (${parts}). Re-run if you just added a repo.`
          : `Synced ${n} outcomes from ${selected.length} repo(s).`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status.oauth_configured && !status.connected) {
    return (
      <p className="rounded-lg bg-warm-dim px-4 py-3 text-sm">
        GitHub OAuth is not configured on the API yet. Add{" "}
        <code className="theme-code">GITHUB_OAUTH_CLIENT_ID</code> and{" "}
        <code className="theme-code">GITHUB_OAUTH_CLIENT_SECRET</code> on the API
        service, then create a GitHub OAuth App.
      </p>
    );
  }

  if (!status.connected) {
    return (
      <section className="theme-panel p-5">
        <div className="flex items-center gap-3">
          <Github className="theme-icon h-8 w-8 shrink-0" />
          <div>
            <h2 className="theme-heading text-base font-medium">Connect GitHub</h2>
            <p className="text-sm theme-text-muted">
              Sign in with GitHub — we fetch merged PRs as outcomes. No PAT
              copy-paste.
            </p>
          </div>
        </div>
        <a
          href={connectUrl}
          className="theme-btn-primary mt-4"
          style={{ background: "var(--text)", color: "var(--bg-card)" }}
        >
          <Github className="h-4 w-4" />
          Connect with GitHub
        </a>
      </section>
    );
  }

  return (
    <section className="theme-panel space-y-4 border-[color-mix(in_srgb,var(--accent)_35%,transparent)] p-5">
      <div>
        <p className="text-sm theme-accent">
          Connected as <span className="font-medium">{status.login}</span>
        </p>
        <p className="mt-1 text-xs theme-text-dim">
          Select repos to track merged PR outcomes. New repo missing? Re-connect
          GitHub below or add by name.
        </p>
        <a href={connectUrl} className="theme-accent mt-2 inline-block text-xs hover:underline">
          Re-connect GitHub (refresh repo access)
        </a>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter repos…"
        className="theme-input"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={manualRepo}
          onChange={(e) => setManualRepo(e.target.value)}
          placeholder="aamirsec6/outcome-ledger"
          className="theme-input min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={addManualRepo}
          disabled={busy}
          className="theme-btn-secondary shrink-0"
        >
          Add repo
        </button>
      </div>
      <div className="theme-inset max-h-48 space-y-1 overflow-y-auto p-2">
        {filteredOptions.length === 0 ? (
          <p className="p-2 text-sm theme-text-muted">
            {repoOptions.length === 0
              ? "No repos from GitHub — add manually or re-connect."
              : "No match — try Add repo above."}
          </p>
        ) : (
          filteredOptions.map((name) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm theme-text-muted hover:bg-[var(--bg-hover)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(name)}
                onChange={(e) => {
                  setSelected((prev) =>
                    e.target.checked
                      ? [...prev, name]
                      : prev.filter((x) => x !== name),
                  );
                }}
                className="accent-[var(--accent)]"
              />
              {name}
            </label>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={saveAndSync}
        disabled={busy}
        className="theme-btn-primary"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save repos & sync
      </button>
      {message ? <p className="theme-message">{message}</p> : null}
    </section>
  );
}
