import { cookies } from "next/headers";
import { isClerkEnabled } from "@/lib/clerk-config";

export const ONBOARDING_COOKIE = "ol_onboarding_complete";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export type OnboardingGate = {
  complete: boolean;
  progress?: { done: number; total: number };
  reason?: string;
};

export async function fetchOnboardingGate(): Promise<OnboardingGate> {
  const store = await cookies();
  if (store.get(ONBOARDING_COOKIE)?.value === "1") {
    return { complete: true };
  }

  if (!API_URL) {
    return { complete: false, reason: "api_not_configured" };
  }

  try {
    const { outcomeLedgerHeaders } = await import("@/lib/api-headers");
    const res = await fetch(`${API_URL}/v1/onboarding/status`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { complete: false, reason: `api_${res.status}` };
    }
    const data = await res.json();
    return {
      complete: Boolean(data.complete),
      progress: data.progress,
    };
  } catch {
    return { complete: false, reason: "api_unreachable" };
  }
}

/** Clerk SaaS: new users must finish setup before dashboard. */
export async function requireOnboardingComplete(): Promise<OnboardingGate> {
  if (!isClerkEnabled()) {
    return { complete: true };
  }
  return fetchOnboardingGate();
}
