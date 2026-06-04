import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export async function GET() {
  if (!API_URL) {
    return NextResponse.json({ keys: [] }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/tenants/api-keys`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/v1/tenants/api-keys`, {
    method: "POST",
    headers: {
      ...(await outcomeLedgerHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: body.name || "agent" }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
