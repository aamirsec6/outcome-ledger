"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Key, RefreshCw } from "lucide-react";
import {
  clearAgentKeyLocally,
  loadAgentKeyLocally,
  saveAgentKeyLocally,
} from "@/lib/agent-key-storage";

export function AgentApiKeyCard() {
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/agent/api-keys");
    if (!res.ok) return;
    const data = await res.json();
    const agent = (data.keys || []).find(
      (k: { name: string; revokedAt: string | null }) =>
        k.name === "agent" && !k.revokedAt,
    );
    setKeyPrefix(agent?.keyPrefix ?? null);
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
  }

  async function createKey() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agent/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.apiKey) {
        persistKey(data.apiKey);
        setMessage("Saved in this browser — copy it for your private sync agent.");
      } else if (data.existing) {
        setMessage(
          data.message ||
            "A key already exists. Rotate to get a new one, or use the copy saved in this browser.",
        );
        await load();
      } else {
        setMessage(data.detail || data.message || "Could not create key");
      }
    } finally {
      setLoading(false);
    }
  }

  async function rotate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agent/api-keys/rotate", { method: "POST" });
      const data = await res.json();
      if (data.apiKey) {
        persistKey(data.apiKey);
        setMessage("New key saved in this browser — update your agent config if you rotated.");
      } else {
        setMessage(data.message || data.detail || "Rotate failed");
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
    setMessage("Removed from this browser. Your workspace key still works until you rotate.");
  }

  return (
    <section className="theme-panel space-y-4 p-5">
      <div className="flex items-start gap-3">
        <Key className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="theme-heading text-lg font-semibold">Outcome Ledger API key</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Use this <code className="text-xs">ol_…</code> key for the private sync agent on
            your computer. Dashboard sync uses your sign-in — you don&apos;t need this key for
            &quot;Run full sync&quot; in the browser.
          </p>
        </div>
      </div>

      {keyPrefix && !fullKey ? (
        <p className="text-sm">
          Active key on server: <code className="theme-code">{keyPrefix}…</code>
          <span className="theme-text-muted">
            {" "}
            — create or rotate to reveal the full key here, or use a copy you saved earlier.
          </span>
        </p>
      ) : null}

      {fullKey ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium theme-text-muted">Your workspace key</p>
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
            Kept in this browser session so you can return to Settings and copy again.
          </p>
        </div>
      ) : null}

      {message ? <p className="text-xs theme-text-muted">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        {!keyPrefix && !fullKey ? (
          <button
            type="button"
            disabled={loading}
            onClick={createKey}
            className="theme-accent-bg rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create API key"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={loading}
          onClick={rotate}
          className="theme-btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          {loading ? "Rotating…" : "Rotate key"}
        </button>
        {fullKey ? (
          <button
            type="button"
            onClick={removeLocal}
            className="rounded-md px-3 py-2 text-sm theme-text-muted hover:underline"
          >
            Remove from this browser
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
