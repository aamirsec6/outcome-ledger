import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant-session";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const apiKey = String(body.apiKey || "").trim();
  if (!apiKey.startsWith("ol_")) {
    return NextResponse.json(
      { ok: false, error: "Invalid workspace API key" },
      { status: 400 },
    );
  }

  if (API_URL) {
    const probe = await fetch(`${API_URL}/v1/tenants/me`, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
    });
    if (!probe.ok) {
      return NextResponse.json(
        { ok: false, error: "Could not verify workspace key" },
        { status: 401 },
      );
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TENANT_COOKIE, apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(TENANT_COOKIE);
  return res;
}
