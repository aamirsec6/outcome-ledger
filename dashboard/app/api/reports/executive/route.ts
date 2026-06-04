import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function POST() {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/reports/executive`, {
    method: "POST",
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail || "Generate failed" },
      { status: res.status },
    );
  }
  return NextResponse.json(data);
}
