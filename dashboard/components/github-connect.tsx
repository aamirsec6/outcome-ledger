"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, Loader2, Zap } from "lucide-react";
import type { GithubStatus } from "@/lib/github-api";

type Repo = { full_name: string; private?: boolean };

export function GitHubConnectPanel({
  connectUrl,
  installAppUrl,
  status,
  availableRepos,
}: {
  connectUrl: string;
  installAppUrl: string;
  status: GithubStatus;
  availableRepos: Repo[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(status.repos || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manualRepo, setManualRepo] = useState("");
  const isApp = status.mode === "app";
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

  async function startAppInstall() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(installAppUrl);
      const data = await res.json();
      if (!res.ok || !data.installUrl) {
        setMessage(data.error || data.detail || "Could not start GitHub App install");
        return;
      }
      window.location.href = data.installUrl;
    } finally {
      setBusy(false);
    }
  }

  async function refreshAppRepos() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/github/app/refresh-repos", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Refresh failed");
        return;
      }
      setMessage(`Refreshed ${data.count} repos from GitHub App installation.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
    if (!isApp && selected.length === 0) {
      setMessage("Pick at least one repository.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (!isApp) {
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
          ? `Synced ${n} wins (${parts}).`
          : `Synced ${n} wins from ${isApp ? status.repos_count : selected.length} repo(s).`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status.connected) {
    const canApp = status.app_configured;
    const canOauth = status.oauth_configured;

    if (!canApp && !canOauth) {
      return (
        <p className="rounded-lg bg-warm-dim px-4 py-3 text-sm">
          GitHub is not configured on the API. Add GitHub App env vars (
          <code className="theme-code">GITHUB_APP_ID</code>,{" "}
          <code className="theme-code">GITHUB_APP_PRIVATE_KEY</code>) or OAuth (
          <code className="theme-code">GITHUB_OAUTH_CLIENT_ID</code>).
        </p>
      );
    }

    return (
      <section className="theme-panel space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Github className="theme-icon h-8 w-8 shrink-0" />
          <div>
            <h2 className="theme-heading text-base font-medium">GitHub</h2>
            <p className="text-sm theme-text-muted">
              Track merged PRs as wins. Install the app for real-time webhooks (recommended).
            </p>
          </div>
        </div>

        {canApp ? (
          <div className="theme-inset space-y-3 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text)" }}>
              <Zap className="h-4 w-4 text-emerald-400" />
              Recommended — GitHub App
            </div>
            <p className="text-xs theme-text-muted">
              Org-level install like Weave. Real-time merge webhooks, auto repo access, PR cost comments.
            </p>
            <button
              type="button"
              onClick={startAppInstall}
              disabled={busy}
              className="theme-btn-primary"
              style={{ background: "var(--text)", color: "var(--bg-card)" }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              Install Outcome Ledger on GitHub
            </button>
          </div>
        ) : null}

        {canOauth ? (
          <div className="space-y-2">
            <p className="text-xs theme-text-dim">Or connect with personal OAuth (manual repo picker):</p>
            <a href={connectUrl} className="theme-btn-secondary inline-flex">
              <Github className="h-4 w-4" />
              Connect with GitHub OAuth
            </a>
          </div>
        ) : null}

        {message ? <p className="theme-message">{message}</p> : null}
      </section>
    );
  }

  if (isApp) {
    return (
      <section className="theme-panel space-y-4 border-[color-mix(in_srgb,var(--accent)_35%,transparent)] p-5">
        <div>
          <p className="flex items-center gap-2 text-sm theme-accent">
            <Zap className="h-4 w-4" />
            GitHub App installed as <span className="font-medium">{status.login}</span>
          </p>
          <p className="mt-1 text-xs theme-text-dim">
            Webhooks live — merged PRs ingest in real time. {status.repos_count ?? 0} repos
            from your installation.
          </p>
        </div>
        <ul className="theme-inset max-h-40 space-y-1 overflow-y-auto p-2 text-xs theme-text-muted">
          {(status.repos || []).slice(0, 30).map((name) => (
            <li key={name}>{name}</li>
          ))}
          {(status.repos_count ?? 0) > 30 ? (
            <li className="theme-text-dim">…and {(status.repos_count ?? 0) - 30} more</li>
          ) : null}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshAppRepos} disabled={busy} className="theme-btn-secondary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Refresh repos
          </button>
          <button type="button" onClick={saveAndSync} disabled={busy} className="theme-btn-primary">
            Backfill sync
          </button>
        </div>
        {message ? <p className="theme-message">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="theme-panel space-y-4 border-[color-mix(in_srgb,var(--accent)_35%,transparent)] p-5">
      <div>
        <p className="text-sm theme-accent">
          Connected via OAuth as <span className="font-medium">{status.login}</span>
        </p>
        <p className="mt-1 text-xs theme-text-dim">
          Choose repos to track. For webhooks, switch to{" "}
          <button type="button" onClick={startAppInstall} className="theme-accent hover:underline">
            GitHub App install
          </button>
          .
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
        <button type="button" onClick={addManualRepo} disabled={busy} className="theme-btn-secondary shrink-0">
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
                    e.target.checked ? [...prev, name] : prev.filter((x) => x !== name),
                  );
                }}
                className="accent-[var(--accent)]"
              />
              {name}
            </label>
          ))
        )}
      </div>
      <button type="button" onClick={saveAndSync} disabled={busy} className="theme-btn-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save repos & sync
      </button>
      {message ? <p className="theme-message">{message}</p> : null}
    </section>
  );
}
