/** Browser-only copy of ol_* key so Settings can show it after reveal/create. */

const STORAGE_KEY = "ol_outcome_ledger_api_key";

export function saveAgentKeyLocally(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    /* quota / private mode */
  }
}

export function loadAgentKeyLocally(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY)?.trim();
    return v && v.startsWith("ol_") ? v : null;
  } catch {
    return null;
  }
}

export function clearAgentKeyLocally(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
