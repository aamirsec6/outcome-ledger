import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/clerk-config";

export const TENANT_COOKIE = "ol_tenant_api_key";

/** Shared deploy: platform admin key in env skips per-tenant cookie. */
export function isSharedTenantDeploy(): boolean {
  return Boolean((process.env.OUTCOME_LEDGER_API_KEY || "").trim());
}

export async function getClerkBearerToken(): Promise<string | undefined> {
  if (!isClerkEnabled()) return undefined;
  try {
    const { getToken } = await auth();
    return (await getToken({ skipCache: true })) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function getTenantApiKey(): Promise<string | undefined> {
  const envKey = (process.env.OUTCOME_LEDGER_API_KEY || "").trim();
  if (envKey) return envKey;
  const store = await cookies();
  const fromCookie = store.get(TENANT_COOKIE)?.value?.trim();
  return fromCookie || undefined;
}

/** Clerk session JWT or legacy ol_ / platform API key. */
export async function hasTenantSession(): Promise<boolean> {
  if (isSharedTenantDeploy()) return true;
  if (isClerkEnabled()) {
    const token = await getClerkBearerToken();
    if (token) return true;
  }
  return Boolean(await getTenantApiKey());
}
