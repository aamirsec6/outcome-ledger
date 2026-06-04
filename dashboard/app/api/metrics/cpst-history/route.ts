import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function GET() {
  if (!API_URL) {
    return NextResponse.json({ history: [], activeContract: null }, { status: 200 });
  }
  const res = await fetch(`${API_URL}/v1/metrics/cpst-history`, {
    headers: outcomeLedgerHeaders(),
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
