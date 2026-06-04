"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "curl", label: "cURL" },
] as const;

const SNIPPETS: Record<(typeof TABS)[number]["id"], string> = {
  node: `const res = await fetch(
  \`\${process.env.OUTCOME_LEDGER_API_URL}/v1/metrics/overview\`,
  { headers: { "X-API-Key": process.env.OUTCOME_LEDGER_API_KEY } }
);
const { orgCpstUsd, attributedSpendPct } = await res.json();`,
  python: `import os, requests

data = requests.get(
    f"{os.environ['OUTCOME_LEDGER_API_URL']}/v1/metrics/overview",
    headers={"X-API-Key": os.environ["OUTCOME_LEDGER_API_KEY"]},
).json()
print(data["orgCpstUsd"], data["attributedSpendPct"])`,
  curl: `curl -s \\
  -H "X-API-Key: $OUTCOME_LEDGER_API_KEY" \\
  "$OUTCOME_LEDGER_API_URL/v1/metrics/overview"`,
};

export function IntegrateSection() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("node");

  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
          Integrate
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[var(--text-muted)]">
          A simple, elegant API so you can start measuring CPST in minutes. SDKs
          for your stack — same formulas as the dashboard.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-code)] shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-md border border-transparent px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "code-tab-active"
                  : "text-[var(--text-dim)] hover:text-[var(--text-muted)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <pre className="overflow-x-auto p-5 text-left font-mono-label text-[13px] leading-relaxed text-zinc-400">
          <code>{SNIPPETS[tab]}</code>
        </pre>
      </div>
    </section>
  );
}
