import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export function apiBase(): string {
  return API_URL;
}

/** Tenant-aware GitHub OAuth — use dashboard proxy route. */
export function connectGithubUrl(): string {
  return "/api/github/connect";
}

export async function fetchGithubStatus() {
  if (!API_URL) return { connected: false, oauth_configured: false };
  const res = await fetch(`${API_URL}/v1/connect/github/status`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { connected: false, oauth_configured: false };
  return res.json();
}

export async function fetchAvailableRepos() {
  if (!API_URL) return { repos: [] };
  const res = await fetch(`${API_URL}/v1/connect/github/repos/available`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { repos: [] };
  return res.json();
}

export async function saveGithubRepos(repos: string[]) {
  if (!API_URL) return { ok: false, error: "API not configured" };
  const res = await fetch(`${API_URL}/v1/connect/github/repos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await outcomeLedgerHeaders()),
    },
    body: JSON.stringify({ repos }),
  });
  return res.json();
}

export async function syncGithub() {
  if (!API_URL) return { ok: false, error: "API not configured" };
  const res = await fetch(`${API_URL}/v1/connect/github/sync`, {
    method: "POST",
    headers: await outcomeLedgerHeaders(),
  });
  return res.json();
}
