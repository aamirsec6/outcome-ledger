import Link from "next/link";
import { Laptop } from "lucide-react";

/** Optional secondary card — cloud sync is the default path. */
export function AgentSetupCard() {
  return (
    <section className="theme-panel flex items-start gap-4 p-5" id="private-agent">
      <Laptop className="theme-icon mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-xs font-medium theme-text-dim">Optional</p>
          <h2 className="theme-heading text-base font-medium">Sync from your computer</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Use this if AI keys must stay on your machine. Most teams sync in the
            browser — no install needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/settings#outcome-ledger-api-key" className="theme-accent underline">
            Get your API key
          </Link>
          <span className="theme-text-dim">·</span>
          <a
            href="https://github.com/aamirsec6/outcome-ledger/blob/main/docs/agent-setup-one-pager.md"
            target="_blank"
            rel="noopener noreferrer"
            className="theme-accent underline"
          >
            Setup guide
          </a>
        </div>
      </div>
    </section>
  );
}
