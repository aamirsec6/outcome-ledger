import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export async function GET() {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/connect/github/start`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.authorizeUrl) {
    return NextResponse.json(
      { error: data.detail || "GitHub OAuth unavailable" },
      { status: res.status || 503 },
    );
  }
  return NextResponse.redirect(data.authorizeUrl);
}
