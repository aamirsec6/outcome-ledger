import { PRODUCT_LAYERS } from "@/lib/marketing-content";

const BENTO: Record<string, string> = {
  ingest: "md:col-span-2 md:row-span-1",
  outcomes: "",
  attribution: "",
  cpst: "md:col-span-2",
  contracts: "",
  reports: "",
};

export function LayersSection() {
  return (
    <section id="product" className="scroll-mt-28 border-t border-[var(--border)] px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mt-0 max-w-2xl text-2xl font-medium tracking-tight text-white md:text-3xl">
          Six layers. One number finance trusts.
        </h2>
        <p className="mt-4 max-w-xl text-[var(--text-muted)]">
          Not another token chart — a unified stack from vendor ingest to CFO-signable
          exports.
        </p>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {PRODUCT_LAYERS.map((layer, i) => (
            <article
              key={layer.id}
              className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition duration-300 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] ${BENTO[layer.id] ?? ""}`}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition group-hover:opacity-100"
                style={{ background: i % 2 === 0 ? "var(--accent-glow)" : "var(--warm-dim)" }}
              />
              <span className="font-mono-label relative text-[10px] font-medium uppercase tracking-wider text-emerald-500/90">
                {layer.status}
              </span>
              <h3 className="font-display relative mt-4 text-xl font-semibold text-white">
                {layer.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {layer.description}
              </p>
              <ul className="relative mt-5 flex flex-wrap gap-2">
                {layer.bullets.map((b) => (
                  <li
                    key={b}
                    className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px] text-zinc-400"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
