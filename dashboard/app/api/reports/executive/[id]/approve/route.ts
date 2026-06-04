import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/reports/executive/${id}/approve`, {
    method: "POST",
    headers: {
      ...(await outcomeLedgerHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail || "Approve failed" },
      { status: res.status },
    );
  }
  return NextResponse.json(data);
}
