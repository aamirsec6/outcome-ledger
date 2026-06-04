import { NextResponse } from "next/server";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.OUTCOME_LEDGER_API_KEY || "";

export async function PUT(request: Request) {
  if (!API_URL || !API_KEY) {
    return NextResponse.json({ ok: false, error: "API not configured" }, { status: 503 });
  }
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/settings/team-mappings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
