const RESPONSES = [
  { status: "200", body: '{ "orgCpstUsd": 4280, "stableOutcomes": 47 }' },
  { status: "200", body: '{ "attributedSpendPct": 82, "meetsTarget": true }' },
  { status: "200", body: '{ "periodLabel": "Last 90 days (live)" }' },
];

const FEATURES = [
  {
    title: "Deterministic CPST",
    body: "Fully loaded spend ÷ accepted outcomes. SQL aggregates only — never LLM-estimated numbers.",
  },
  {
    title: "Outcome contracts",
    body: "Version what counts as a win. CFO sign-off travels with every board export.",
  },
  {
    title: "Human-in-the-loop reports",
    body: "Generate narrative from metrics JSON. Approve before PDF leaves your org.",
  },
];

export function DeveloperExperience() {
  return (
    <section className="border-t border-[var(--border)] px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
              First-class
              <br />
              developer experience
            </h2>
            <p className="mt-4 max-w-md text-[var(--text-muted)] leading-relaxed">
              We are engineers who wanted one metric finance trusts — CPST that
              just works. OpenAPI, webhooks-ready ingest, and audit logs on every
              sync.
            </p>
            <div className="mt-8 space-y-2 font-mono-label text-sm">
              {RESPONSES.map((r) => (
                <div
                  key={r.body}
                  className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <span className="shrink-0 text-[var(--accent)]">HTTP {r.status}:</span>
                  <span className="text-[var(--text-dim)] break-all">{r.body}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--border-strong)]"
              >
                <h3 className="font-medium text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
