import { NAV } from "@/lib/copy";

const TITLES: Record<string, string> = {
  "/overview": NAV.overview,
  "/teams": NAV.teams,
  "/integrations": NAV.integrations,
  "/reports": NAV.reports,
  "/contracts": NAV.winDefinition,
  "/settings": NAV.settings,
};

export function titleForPath(pathname: string | null): string {
  if (!pathname) return NAV.overview;
  const base = pathname.split("?")[0];
  return TITLES[base] || "Outcome Ledger";
}
