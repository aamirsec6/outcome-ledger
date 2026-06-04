import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { getTenantApiKey } from "@/lib/tenant-session";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function GET() {
  const key = await getTenantApiKey();
  if (!API_URL || !key) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/reports/export.csv`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Export failed" },
      { status: res.status },
    );
  }
  const body = await res.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="outcome-ledger-cpst.csv"',
    },
  });
}
