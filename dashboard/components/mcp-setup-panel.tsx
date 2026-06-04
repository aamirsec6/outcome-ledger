"use client";

import { useState } from "react";
import { Copy, Terminal } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL?.replace(/\/$/, "") ||
  "https://outcome-ledger-production.up.railway.app";

const configureCmd = `outcome-ledger-mcp configure \\
  --outcome-ledger-url ${API_URL} \\
  --outcome-ledger-key ol_YOUR_WORKSPACE_KEY \\
  --github-token ghp_... \\
  --github-repos "org/repo1,org/repo2"`;

const mcpJson = JSON.stringify(
  {
    mcpServers: {
      "outcome-ledger": {
        command: "outcome-ledger-mcp",
        args: ["serve"],
        env: {
          OUTCOME_LEDGER_URL: API_URL,
          OUTCOME_LEDGER_KEY: "ol_...",
        },
      },
    },
  },
  null,
  2,
);

export function McpSetupPanel() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="theme-panel space-y-4 p-5">
      <div className="flex items-start gap-3">
        <Terminal className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="theme-heading text-lg font-semibold">Local MCP agent</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Fetch OpenAI, Anthropic, Cursor, Claude Code, Copilot, and GitHub outcomes on
            your machine — vendor keys never leave your infrastructure. Requires your
            workspace API key (<code className="text-xs">ol_*</code>) from workspace setup.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide theme-text-muted">
          Install
        </p>
        <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs">
          cd mcp && pip install -e .
        </pre>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide theme-text-muted">
            Configure
          </p>
          <button
            type="button"
            onClick={() => copy("configure", configureCmd)}
            className="flex items-center gap-1 text-xs theme-accent"
          >
            <Copy className="h-3 w-3" />
            {copied === "configure" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs whitespace-pre-wrap">
          {configureCmd}
        </pre>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide theme-text-muted">
            Cursor MCP config
          </p>
          <button
            type="button"
            onClick={() => copy("mcp", mcpJson)}
            className="flex items-center gap-1 text-xs theme-accent"
          >
            <Copy className="h-3 w-3" />
            {copied === "mcp" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="max-h-48 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs">
          {mcpJson}
        </pre>
      </div>

      <p className="text-xs theme-text-dim">
        Then run <code className="text-[var(--fg)]">outcome-ledger-mcp sync --since 30d</code>{" "}
        or use the <code className="text-[var(--fg)]">outcome_ledger_sync</code> MCP tool.{" "}
        See <span className="theme-accent">docs/mcp-setup.md</span> in the repository for the full setup guide.
      </p>
    </section>
  );
}
