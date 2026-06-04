import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

export async function PUT(request: Request) {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/connections/openai`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await outcomeLedgerHeaders()),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
