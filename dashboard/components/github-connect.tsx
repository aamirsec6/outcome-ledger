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

  const repoOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of availableRepos) {
      if (r.full_name) names.add(r.full_name);
    }
    for (const r of status.repos || []) names.add(r);
    return Array.from(names).sort();
  }, [availableRepos, status.repos]);

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
      setMessage(
        `Synced ${syncData.inserted ?? 0} merged PR outcomes from ${selected.length} repo(s).`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status.oauth_configured && !status.connected) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        GitHub OAuth is not configured on the API yet. Add{" "}
        <code className="text-xs">GITHUB_OAUTH_CLIENT_ID</code> and{" "}
        <code className="text-xs">GITHUB_OAUTH_CLIENT_SECRET</code> on the API
        service, then create a GitHub OAuth App.
      </p>
    );
  }

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-3">
          <Github className="h-8 w-8 text-white" />
          <div>
            <h2 className="font-medium text-white">Connect GitHub</h2>
            <p className="text-sm text-slate-400">
              Sign in with GitHub — we fetch merged PRs as outcomes. No PAT
              copy-paste.
            </p>
          </div>
        </div>
        <a
          href={connectUrl}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
        >
          <Github className="h-4 w-4" />
          Connect with GitHub
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-teal-500/30 bg-slate-900/50 p-5 space-y-4">
      <div>
        <p className="text-sm text-teal-300">
          Connected as <span className="font-medium">{status.login}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Select repos to track merged PR outcomes
        </p>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-slate-800 p-2">
        {repoOptions.length === 0 ? (
          <p className="text-sm text-slate-500 p-2">Loading repos…</p>
        ) : (
          repoOptions.map((name) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
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
                className="rounded border-slate-600"
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
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save repos & sync
      </button>
      {message ? <p className="text-sm text-slate-400">{message}</p> : null}
    </div>
  );
}
