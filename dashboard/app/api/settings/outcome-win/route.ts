import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function GET() {
  if (!API_URL) {
    return NextResponse.json(
      {
        winType: "pr_merged_stable",
        stableDays: 7,
        options: [],
        summary: "",
        contract: null,
      },
      { status: 200 },
    );
  }
  const res = await fetch(`${API_URL}/v1/settings/outcome-win`, {
    headers: await outcomeLedgerHeaders(),
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(req: Request) {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/settings/outcome-win`, {
    method: "PUT",
    headers: await outcomeLedgerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
