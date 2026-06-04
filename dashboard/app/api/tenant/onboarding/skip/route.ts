import { NextResponse } from "next/server";
import { ONBOARDING_COOKIE } from "@/lib/onboarding-gate";

/** Let user explore the dashboard before every integration is wired. */
export async function POST() {
  const res = NextResponse.json({ ok: true, skipped: true });
  res.cookies.set(ONBOARDING_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
