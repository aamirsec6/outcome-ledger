import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { getTenantApiKey } from "@/lib/tenant-session";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function PUT(request: Request) {
  const key = await getTenantApiKey();
  if (!API_URL || !key) {
    return NextResponse.json({ ok: false, error: "API not configured" }, { status: 503 });
  }
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/settings/team-mappings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await outcomeLedgerHeaders()),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
