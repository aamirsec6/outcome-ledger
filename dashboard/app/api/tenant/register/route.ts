import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant-session";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export async function POST(request: Request) {
  if (!API_URL) {
    return NextResponse.json(
      { ok: false, error: "OUTCOME_LEDGER_API_URL not configured" },
      { status: 503 },
    );
  }
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/tenants/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name,
      companyName: body.companyName,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: data.detail || "Registration failed" },
      { status: res.status },
    );
  }

  const apiKey = String(data.apiKey || "").trim();
  const out = NextResponse.json({
    ok: true,
    orgId: data.orgId,
    name: data.name,
    apiKey,
  });
  if (apiKey.startsWith("ol_")) {
    out.cookies.set(TENANT_COOKIE, apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return out;
}
