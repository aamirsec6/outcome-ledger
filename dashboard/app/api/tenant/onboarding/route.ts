import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { ONBOARDING_COOKIE } from "@/lib/onboarding-gate";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export async function GET() {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/onboarding/status`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  const response = NextResponse.json(data, { status: res.status });
  if (res.ok && data.complete) {
    response.cookies.set(ONBOARDING_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
