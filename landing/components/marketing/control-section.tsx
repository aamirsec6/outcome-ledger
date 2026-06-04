const CONTROLS = [
  {
    title: "Attribution coverage",
    desc: "See attributed vs unassigned spend by vendor. Team mappings raise board-ready coverage past 80%.",
  },
  {
    title: "Full visibility",
    desc: "Sync runs, outcome events, and contract versions in one audit trail — every dollar traceable.",
  },
  {
    title: "Signed methodology",
    desc: "CFO attestation on active outcome contracts. PDF appendix includes formula version.",
  },
  {
    title: "Revert detection",
    desc: "Stable outcomes exclude PRs reverted within your window. CPST stays honest.",
  },
  {
    title: "Vendor ingest",
    desc: "OpenAI, Anthropic, GitHub, Cursor CSV — no custom agent instrumentation.",
  },
  {
    title: "Intuitive trends",
    desc: "Weekly CPST and monthly snapshots. Green when cost per win falls period over period.",
  },
];

export function ControlSection() {
  return (
    <section className="border-t border-[var(--border)] px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
          Everything in your control
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[var(--text-muted)]">
          All the features you need to manage AI spend attribution, troubleshoot
          with detailed logs, and protect board credibility — without spreadsheet
          chaos.
        </p>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map((c) => (
            <article
              key={c.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left transition hover:border-[var(--border-strong)]"
            >
              <h3 className="font-medium text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {c.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
