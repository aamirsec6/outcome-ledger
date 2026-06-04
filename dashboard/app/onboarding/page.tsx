"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

type Step = { id: string; label: string; done: boolean };

type OnboardingStatus = {
  steps?: Step[];
  progress?: { done: number; total: number };
  complete?: boolean;
  companyName?: string;
};

const STEPS = [
  { id: "workspace", title: "Workspace", desc: "Create your isolated ledger" },
  { id: "profile", title: "Company", desc: "Name shown on reports" },
  { id: "openai", title: "OpenAI spend", desc: "Admin or service account key" },
  { id: "github", title: "GitHub", desc: "Outcomes from merged PRs" },
  { id: "sync", title: "First sync", desc: "Pull spend + outcomes" },
] as const;

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-8 theme-text-muted">Loading…</div>}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/overview";

  const [phase, setPhase] = useState<"register" | "restore" | "setup">("register");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyShown, setApiKeyShown] = useState<string | null>(null);

  const [workspaceName, setWorkspaceName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiOrgId, setOpenaiOrgId] = useState("");
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/tenant/onboarding");
    if (res.ok) {
      const data = await res.json();
      setStatus(data);
      if (data.companyName) setCompanyName(data.companyName);
      if (data.complete) {
        router.replace(nextPath);
      }
    }
  }, [nextPath, router]);

  useEffect(() => {
    async function init() {
      if (clerkOn) {
        await fetch("/api/tenant/clerk-bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        setPhase("setup");
      }
      const r = await fetch("/api/tenant/onboarding");
      if (r.ok) {
        if (!clerkOn) setPhase("setup");
        const data = await r.json();
        setStatus(data);
        if (data.complete) router.replace(nextPath);
        return;
      }
      if (!clerkOn) setPhase("register");
    }
    void init();
  }, [nextPath, router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
          companyName: companyName || workspaceName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create workspace");
        return;
      }
      setApiKeyShown(data.apiKey);
      setPhase("setup");
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/org-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { companyName: companyName || workspaceName },
        }),
      });
      if (!res.ok) {
        setError("Could not save company profile");
        return;
      }
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  async function saveOpenAI() {
    if (!openaiKey.trim()) {
      setError("Paste your OpenAI admin API key (sk-admin-…)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/connections/openai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: openaiKey.trim(),
          openaiOrgId: openaiOrgId.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || "OpenAI save failed");
        return;
      }
      setOpenaiKey("");
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  async function runSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || "Sync failed");
        return;
      }
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  }

  const stepMap = Object.fromEntries(
    (status?.steps || []).map((s) => [s.id, s.done]),
  );

  if (!clerkOn && phase === "restore") {
    return <RestoreKeyForm onDone={() => { setPhase("setup"); void refreshStatus(); }} />;
  }

  if (!clerkOn && phase === "register") {
    return (
      <div className="mx-auto max-w-lg py-16">
        <p className="text-xs font-medium uppercase tracking-wider theme-text-muted">
          Outcome Ledger
        </p>
        <h1 className="theme-heading mt-2 text-3xl font-semibold">
          Create your workspace
        </h1>
        <p className="mt-2 theme-text-muted">
          Each workspace has its own dashboard, API keys, and integration secrets.
          Nothing is shared with other tenants.
        </p>
        <form onSubmit={handleRegister} className="theme-panel mt-8 space-y-4 p-6">
          <label className="block text-sm">
            <span className="theme-text-muted">Workspace name</span>
            <input
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              placeholder="Acme Engineering"
            />
          </label>
          <label className="block text-sm">
            <span className="theme-text-muted">Company name (reports)</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              placeholder="Acme Inc."
            />
          </label>
          {error && (
            <p className="text-sm text-[var(--bad)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="theme-accent-bg w-full rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm theme-text-muted">
          Already have a key?{" "}
          <button
            type="button"
            className="theme-accent underline"
            onClick={() => setPhase("restore")}
          >
            Sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="theme-heading text-2xl font-semibold">Set up your ledger</h1>
      <p className="mt-1 theme-text-muted">
        Complete each step — your credentials stay in your workspace only.
      </p>

      {apiKeyShown && (
        <div className="mt-4 rounded-lg border border-[var(--warn)] bg-[var(--warn-dim)] p-4 text-sm">
          <p className="font-medium">Save your workspace API key (shown once)</p>
          <code className="mt-2 block break-all text-xs">{apiKeyShown}</code>
          <button
            type="button"
            className="mt-2 text-xs theme-accent underline"
            onClick={() => setApiKeyShown(null)}
          >
            I saved it
          </button>
        </div>
      )}

      <ol className="mt-8 space-y-6">
        {STEPS.map((step) => {
          const done = stepMap[step.id];
          return (
            <li
              key={step.id}
              className={cn(
                "theme-panel flex gap-4 p-5",
                done && "opacity-80",
              )}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--good)]" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 theme-text-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.title}</p>
                <p className="text-sm theme-text-muted">{step.desc}</p>
                {step.id === "profile" && !done && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      placeholder="Company name"
                    />
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={loading}
                      className="theme-accent-bg rounded-md px-3 py-2 text-sm text-white"
                    >
                      Save
                    </button>
                  </div>
                )}
                {step.id === "openai" && !done && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-admin-… or service account key"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <input
                      value={openaiOrgId}
                      onChange={(e) => setOpenaiOrgId(e.target.value)}
                      placeholder="org-… (optional)"
                      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={saveOpenAI}
                      disabled={loading}
                      className="theme-accent-bg rounded-md px-3 py-2 text-sm text-white"
                    >
                      Connect OpenAI
                    </button>
                  </div>
                )}
                {step.id === "github" && !done && (
                  <a
                    href="/api/github/connect"
                    className="theme-accent-bg mt-3 inline-block rounded-md px-3 py-2 text-sm text-white"
                  >
                    Connect GitHub
                  </a>
                )}
                {step.id === "sync" && !done && (
                  <button
                    type="button"
                    onClick={runSync}
                    disabled={loading}
                    className="theme-accent-bg mt-3 rounded-md px-3 py-2 text-sm text-white"
                  >
                    {loading ? "Syncing…" : "Run sync"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {error && <p className="mt-4 text-sm text-[var(--bad)]">{error}</p>}

      <div className="mt-8 flex items-center justify-between text-sm">
        <span className="theme-text-muted">
          {status?.progress
            ? `${status.progress.done} / ${status.progress.total} complete`
            : null}
        </span>
        <Link href={nextPath} className="theme-accent hover:underline">
          Skip to dashboard →
        </Link>
      </div>
    </div>
  );
}

function RestoreKeyForm({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tenant/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Invalid key");
      return;
    }
    onDone();
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="theme-heading text-2xl font-semibold">Sign in to workspace</h1>
      <form onSubmit={submit} className="theme-panel mt-6 space-y-4 p-6">
        <input
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="ol_…"
          className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="theme-accent-bg w-full rounded-md py-2.5 text-sm text-white"
        >
          {loading ? "Verifying…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
