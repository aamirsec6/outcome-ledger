import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { hasTenantSession } from "@/lib/tenant-session";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function POST() {
  if (!API_URL || !(await hasTenantSession())) {
    return NextResponse.json({ ok: false, error: "API not configured" }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/sync`, {
    method: "POST",
    headers: await outcomeLedgerHeaders(),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
