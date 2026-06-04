import { NextResponse } from "next/server";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");
const API_KEY = (process.env.OUTCOME_LEDGER_API_KEY || "").trim();

export async function GET() {
  if (!API_URL || !API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const res = await fetch(`${API_URL}/v1/reports/export.csv`, {
    headers: { "X-Api-Key": API_KEY },
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
