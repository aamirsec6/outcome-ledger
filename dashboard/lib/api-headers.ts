/** Server-side only — never expose API keys to the browser bundle. */

import { getClerkBearerToken, getTenantApiKey } from "@/lib/tenant-session";

export async function outcomeLedgerHeaders(
  extra?: Record<string, string>,
): Promise<HeadersInit> {
  const headers: Record<string, string> = { ...extra };

  const clerkToken = await getClerkBearerToken();
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
    return headers;
  }

  const key = await getTenantApiKey();
  if (key) {
    headers["X-Api-Key"] = key;
  }
  return headers;
}
