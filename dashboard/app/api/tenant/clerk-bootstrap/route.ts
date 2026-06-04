import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { isClerkEnabled } from "@/lib/clerk-config";

const API_URL = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  ""
).replace(/\/$/, "");

/** Provision / link Clerk user → Outcome Ledger workspace on first login. */
export async function POST(request: Request) {
  if (!isClerkEnabled() || !API_URL) {
    return NextResponse.json(
      { ok: false, error: "Clerk or API not configured" },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/v1/tenants/clerk-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await outcomeLedgerHeaders()),
    },
    body: JSON.stringify({
      workspaceName: body.workspaceName,
      companyName: body.companyName,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
