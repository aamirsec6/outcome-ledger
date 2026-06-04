import { PRODUCT_LAYERS } from "@/lib/marketing-content";
import { SectionLabel } from "./section-label";

export function LayersSection() {
  return (
    <section id="product" className="scroll-mt-24 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionLabel code="Product layers" />
        <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
          Six layers. One value accounting platform.
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          Every layer is production-ready — ingest through CFO-signable exports. Built
          as a unified system, not another token dashboard.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_LAYERS.map((layer) => (
            <article
              key={layer.id}
              className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-teal-500/30 hover:bg-slate-900/70"
            >
              <span className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                {layer.status}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{layer.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {layer.description}
              </p>
              <ul className="mt-4 space-y-1.5">
                {layer.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2 text-xs text-slate-500"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-teal-500/80" />
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
