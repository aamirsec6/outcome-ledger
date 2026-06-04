"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Key,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { saveAgentKeyLocally } from "@/lib/agent-key-storage";

const API_URL =
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL?.replace(/\/$/, "") ||
  "https://outcome-ledger-production.up.railway.app";

const PIP_INSTALL =
  'pip install "outcome-ledger-mcp @ git+https://github.com/aamirsec6/outcome-ledger.git@main#subdirectory=mcp"';

type AgentKeyInfo = {
  apiKey?: string | null;
  keyPrefix?: string;
  existing?: boolean;
  message?: string;
};

type IngestStatus = {
  usageEventsTotal?: number;
  outcomeEventsTotal?: number;
  lastMcpSync?: string | null;
  sources?: Record<string, { usageEvents?: number; status?: string }>;
};

export function AgentSetupSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="theme-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide theme-text-muted">
            Optional — enterprise
          </p>
          <h2 className="theme-heading text-lg font-semibold">Private sync agent</h2>
          <p className="mt-1 text-sm theme-text-muted">
            API keys stay on your computer. Three steps: copy key → install → sync.
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 shrink-0 theme-text-muted" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 theme-text-muted" />
        )}
      </button>
      {open ? (
        <div className="border-t border-[var(--border)] px-5 pb-5 pt-2">
          <AgentSetupWizard />
        </div>
      ) : null}
    </section>
  );
}

export function AgentSetupWizard({ defaultStep = 1 }: { defaultStep?: number }) {
  const [step, setStep] = useState(defaultStep);
  const [agentKey, setAgentKey] = useState<string | null>(null);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus | null>(null);

  const [githubToken, setGithubToken] = useState("");
  const [githubRepos, setGithubRepos] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  const loadKeys = useCallback(async () => {
    const res = await fetch("/api/agent/api-keys");
    if (!res.ok) return;
    const data = await res.json();
    const agent = (data.keys || []).find(
      (k: { name: string; revokedAt: string | null }) =>
        k.name === "agent" && !k.revokedAt,
    );
    if (agent?.keyPrefix) setKeyPrefix(agent.keyPrefix);
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function generateKey(rotate = false) {
    setLoading(true);
    setAgentKey(null);
    setKeyMessage(null);
    try {
      const res = await fetch(
        rotate ? "/api/agent/api-keys/rotate" : "/api/agent/api-keys",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const data: AgentKeyInfo = await res.json();
      if (!res.ok) {
        setKeyMessage((data as { detail?: string }).detail || "Could not create key");
        return;
      }
      if (data.apiKey) {
        setAgentKey(data.apiKey);
        saveAgentKeyLocally(data.apiKey);
        setKeyPrefix(data.keyPrefix || data.apiKey.slice(0, 12));
      } else {
        setKeyPrefix(data.keyPrefix || keyPrefix);
        setKeyMessage(data.message || "Key already exists — rotate to see a new one.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    const res = await fetch("/api/agent/status");
    if (res.ok) setIngestStatus(await res.json());
  }

  useEffect(() => {
    if (step === 4) void refreshStatus();
  }, [step]);

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  const effectiveKey = agentKey || "ol_YOUR_AGENT_KEY";
  const configureCmd = `outcome-ledger-mcp configure \\
  --outcome-ledger-url ${API_URL} \\
  --outcome-ledger-key ${effectiveKey}${githubToken ? ` \\\n  --github-token ${githubToken}` : ""}${githubRepos ? ` \\\n  --github-repos "${githubRepos}"` : ""}${openaiKey ? ` \\\n  --openai-key ${openaiKey}` : ""}`;

  const syncCmd = "outcome-ledger-mcp sync --since 30d";

  function downloadConfig() {
    const config = {
      outcome_ledger_url: API_URL,
      outcome_ledger_key: agentKey || "",
      github_token: githubToken,
      github_repos: githubRepos.split(",").map((r) => r.trim()).filter(Boolean),
      openai_api_key: openaiKey,
      watch_paths: [],
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "outcome-ledger-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const steps = [
    { n: 1, label: "Agent key" },
    { n: 2, label: "Install" },
    { n: 3, label: "Configure" },
    { n: 4, label: "Verify" },
  ];

  const hasData =
    (ingestStatus?.usageEventsTotal ?? 0) > 0 ||
    (ingestStatus?.outcomeEventsTotal ?? 0) > 0;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              step === s.n
                ? "theme-accent-bg text-white"
                : "theme-badge-neutral theme-text-muted",
            )}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </nav>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm theme-text-muted">
            This key links the agent on your laptop to your workspace. Save it in 1Password
            — we only show the full key once.
          </p>
          {keyPrefix && !agentKey ? (
            <p className="text-sm">
              Active key prefix: <code className="theme-code">{keyPrefix}…</code>
            </p>
          ) : null}
          {agentKey ? (
            <div className="rounded-lg border border-[var(--warn)] bg-[var(--warn-dim)] p-4">
              <p className="text-xs font-medium text-[var(--warn)]">Copy now</p>
              <code className="mt-2 block break-all text-xs">{agentKey}</code>
              <button
                type="button"
                className="theme-accent mt-3 text-xs underline"
                onClick={() => copy(agentKey, "key")}
              >
                {copied === "key" ? "Copied" : "Copy key"}
              </button>
            </div>
          ) : null}
          {keyMessage ? <p className="text-sm theme-text-muted">{keyMessage}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => generateKey(false)}
              className="theme-accent-bg rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              <Key className="mr-1 inline h-4 w-4" />
              {loading ? "Working…" : agentKey ? "Generate another" : "Create agent key"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => generateKey(true)}
              className="theme-btn-secondary rounded-md px-4 py-2 text-sm"
            >
              <RefreshCw className="mr-1 inline h-4 w-4" />
              Rotate key
            </button>
          </div>
          <button
            type="button"
            className="text-sm theme-accent underline"
            onClick={() => setStep(2)}
          >
            Next: Install →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm theme-text-muted">Run once on the machine that holds your API keys.</p>
          <CopyBlock label="install" text={PIP_INSTALL} copied={copied} onCopy={copy} />
          <p className="text-xs theme-text-dim">
            Or after PyPI: <code className="theme-code">pip install outcome-ledger-mcp</code>
          </p>
          <button type="button" className="text-sm theme-accent underline" onClick={() => setStep(3)}>
            Next: Configure →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm theme-text-muted">
            Optional: fill vendor credentials here, then copy the configure command or download
            config for <code className="theme-code">~/.outcome-ledger/config.json</code>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="theme-text-muted">GitHub token</span>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                placeholder="ghp_…"
              />
            </label>
            <label className="block text-sm">
              <span className="theme-text-muted">Repos (comma-separated)</span>
              <input
                value={githubRepos}
                onChange={(e) => setGithubRepos(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                placeholder="org/repo1, org/repo2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="theme-text-muted">OpenAI admin key</span>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                placeholder="sk-admin-…"
              />
            </label>
          </div>
          <CopyBlock label="configure" text={configureCmd} copied={copied} onCopy={copy} />
          <CopyBlock label="sync" text={syncCmd} copied={copied} onCopy={copy} />
          <button
            type="button"
            onClick={downloadConfig}
            className="theme-btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Download config.json
          </button>
          <p className="text-xs theme-text-dim">
            IT runbook: see <strong>docs/agent-setup-one-pager.md</strong> in the repository.
          </p>
          <details className="text-xs theme-text-dim">
            <summary className="cursor-pointer theme-text-muted">Advanced: Cursor MCP server</summary>
            <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--border)] p-3">
              {JSON.stringify(
                {
                  mcpServers: {
                    "outcome-ledger": {
                      command: "outcome-ledger-mcp",
                      args: ["serve"],
                      env: {
                        OUTCOME_LEDGER_URL: API_URL,
                        OUTCOME_LEDGER_KEY: effectiveKey,
                      },
                    },
                  },
                },
                null,
                2,
              )}
            </pre>
          </details>
          <button type="button" className="text-sm theme-accent underline" onClick={() => setStep(4)}>
            Next: Verify →
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm theme-text-muted">
            After <code className="theme-code">outcome-ledger-mcp sync --since 30d</code>, refresh
            to see data in your workspace.
          </p>
          <button
            type="button"
            onClick={() => refreshStatus()}
            className="theme-btn-secondary rounded-md px-3 py-2 text-sm"
          >
            Refresh status
          </button>
          {hasData ? (
            <div className="flex items-center gap-2 text-[var(--good)]">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Data received — check Overview for CPST</span>
            </div>
          ) : (
            <p className="text-sm theme-text-muted">No usage or outcome events yet.</p>
          )}
          <ul className="space-y-2 text-sm">
            <li>
              Usage events: <strong>{ingestStatus?.usageEventsTotal ?? 0}</strong>
            </li>
            <li>
              Outcome events: <strong>{ingestStatus?.outcomeEventsTotal ?? 0}</strong>
            </li>
            {ingestStatus?.lastMcpSync ? (
              <li>Last agent sync: {ingestStatus.lastMcpSync}</li>
            ) : null}
          </ul>
          {ingestStatus?.sources && Object.keys(ingestStatus.sources).length > 0 ? (
            <div className="rounded-md border border-[var(--border)] p-3 text-xs">
              <p className="font-medium theme-text-muted">By source</p>
              <ul className="mt-2 space-y-1">
                {Object.entries(ingestStatus.sources).map(([src, meta]) => (
                  <li key={src}>
                    {src}: {meta.usageEvents ?? 0} usage events
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CopyBlock({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-xs font-medium uppercase theme-text-muted">{label}</span>
        <button
          type="button"
          onClick={() => onCopy(text, label)}
          className="flex items-center gap-1 text-xs theme-accent"
        >
          <Copy className="h-3 w-3" />
          {copied === label ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs">
        {text}
      </pre>
    </div>
  );
}
