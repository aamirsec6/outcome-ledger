/** Server-side only — never expose OUTCOME_LEDGER_API_KEY to the browser. */

export function outcomeLedgerHeaders(
  extra?: Record<string, string>,
): HeadersInit {
  const key = (process.env.OUTCOME_LEDGER_API_KEY || "").trim();
  const headers: Record<string, string> = { ...extra };
  if (key) {
    headers["X-Api-Key"] = key;
  }
  return headers;
}
