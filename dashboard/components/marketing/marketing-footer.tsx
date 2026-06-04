import Link from "next/link";
import { BarChart3 } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-400" />
              <span className="font-semibold text-white">Outcome Ledger</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              Value accounting for AI-assisted engineering. CPST — cost per accepted
              outcome. Standalone; not Authon or Agent Money.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium text-slate-300">Product</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>
                  <a href="#product" className="hover:text-slate-300">
                    Layers
                  </a>
                </li>
                <li>
                  <a href="#use-cases" className="hover:text-slate-300">
                    Use cases
                  </a>
                </li>
                <li>
                  <a href="#get-started" className="hover:text-slate-300">
                    Waitlist
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-300">App</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>
                  <Link href="/overview" className="hover:text-slate-300">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/integrations" className="hover:text-slate-300">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="hover:text-slate-300">
                    Full waitlist page
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-300">Docs</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>
                  <a
                    href="https://github.com"
                    className="hover:text-slate-300"
                    rel="noopener noreferrer"
                  >
                    GitHub (MIT)
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} Outcome Ledger. MIT License.
        </p>
      </div>
    </footer>
  );
}
