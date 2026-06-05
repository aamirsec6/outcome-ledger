"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Eye, Key, RefreshCw } from "lucide-react";
import {
  clearAgentKeyLocally,
  loadAgentKeyLocally,
  saveAgentKeyLocally,
} from "@/lib/agent-key-storage";

type AgentApiKeyCardProps = {
  initialPrefix?: string | null;
  initialName?: string | null;
  initialError?: string | null;
};

export function AgentApiKeyCard({
  initialPrefix = null,
  initialName = null,
  initialError = null,
}: AgentApiKeyCardProps) {
  const [keyPrefix, setKeyPrefix] = useState<string | null>(initialPrefix);
  const [keyName, setKeyName] = useState<string | null>(initialName);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/agent/api-keys");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.detail === "string"
          ? data.detail
          : "Could not load API key — try signing out and back in.",
      );
      return;
    }
    setKeyPrefix(data.primaryKeyPrefix ?? null);
    setKeyName(data.primaryKeyName ?? null);
  }, []);

  useEffect(() => {
    void load();
    const saved = loadAgentKeyLocally();
    if (saved) setFullKey(saved);
  }, [load]);

  function persistKey(key: string) {
    setFullKey(key);
    saveAgentKeyLocally(key);
    setKeyPrefix(key.slice(0, 12));
    setKeyName("agent");
    setError(null);
  }

  async function revealKey() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/agent/api-keys/reveal", { method: "POST" });
      const data = await res.json();
      if (data.apiKey) {
        persistKey(data.apiKey);
        setMessage(
          "Key saved in this browser. Copy it for outcome-ledger-mcp configure — we cannot show it again from the server unless you reveal again.",
        );
      } else {
        setError(data.detail || data.message || "Could not reveal API key");
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function rotate() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/agent/api-keys/rotate", { method: "POST" });
      const data = await res.json();
      if (data.apiKey) {
        persistKey(data.apiKey);
        setMessage("New key saved in this browser — update your agent if you rotated.");
      } else {
        setError(data.message || data.detail || "Rotate failed");
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (!fullKey) return;
    void navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function removeLocal() {
    clearAgentKeyLocally();
    setFullKey(null);
    setMessage("Removed from this browser. Click “Show API key” to reveal again.");
  }

  return (
    <section className="theme-panel space-y-4 p-5" id="outcome-ledger-api-key">
      <div className="flex items-start gap-3">
        <Key className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="theme-heading text-lg font-semibold">Outcome Ledger API key</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Your <code className="text-xs">ol_…</code> key for the private sync agent. Browser
            sync uses your sign-in — this key is only needed for{' '}
            <code className="text-xs">outcome-ledger-mcp</code> on your computer.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--bad)]">{error}</p> : null}

      {keyPrefix && !fullKey ? (
        <p className="text-sm">
          Workspace key active: <code className="theme-code">{keyPrefix}…</code>
          {keyName ? (
            <span className="theme-text-muted"> ({keyName})</span>
          ) : null}
          <span className="block mt-1 text-xs theme-text-muted">
            The full key is hidden for security. Click <strong>Show API key</strong> to generate
            a copy you can use with the agent.
          </span>
        </p>
      ) : null}

      {!keyPrefix && !fullKey && !error ? (
        <p className="text-sm theme-text-muted">
          No key yet — click <strong>Show API key</strong> to create one.
        </p>
      ) : null}

      {fullKey ? (
        <div className="rounded-lg border border-[var(--good)] bg-[var(--good-dim)] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[var(--good)]">Your API key</p>
            <button
              type="button"
              onClick={copyKey}
              className="flex items-center gap-1 text-xs theme-accent"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="block break-all text-xs">{fullKey}</code>
          <p className="mt-2 text-xs theme-text-dim">
            Saved in this browser (localStorage) until you remove it.
          </p>
        </div>
      ) : null}

      {message ? <p className="text-xs theme-text-muted">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={revealKey}
          className="theme-btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          <Eye className="h-4 w-4" />
          {loading ? "Working…" : fullKey ? "Reveal new key" : "Show API key"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={rotate}
          className="theme-btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Rotate key
        </button>
        {fullKey ? (
          <button
            type="button"
            onClick={removeLocal}
            className="rounded-md px-3 py-2 text-sm theme-text-muted hover:underline"
          >
            Remove from browser
          </button>
        ) : null}
        <Link
          href="/integrations#private-agent"
          className="theme-accent inline-flex items-center text-sm underline"
        >
          Agent setup wizard →
        </Link>
      </div>
    </section>
  );
}
