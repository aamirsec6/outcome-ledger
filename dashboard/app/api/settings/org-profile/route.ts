import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function GET() {
  if (!API_URL) {
    return NextResponse.json({ profile: { companyName: "Your organization" } });
  }
  const res = await fetch(`${API_URL}/v1/settings/org-profile`, {
    headers: outcomeLedgerHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ profile: { companyName: "Your organization" } });
  }
  return res.json();
}

export async function PUT(req: Request) {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/settings/org-profile`, {
    method: "PUT",
    headers: {
      ...outcomeLedgerHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail || "Save failed" },
      { status: res.status },
    );
  }
  return NextResponse.json(data);
}
