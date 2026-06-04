import { NextRequest, NextResponse } from "next/server";

const API = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  "http://127.0.0.1:8090"
).replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${API}/v1/waitlist/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": req.headers.get("user-agent") || "outcome-ledger-dashboard",
        "X-Forwarded-For": req.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 503 });
  }
}
