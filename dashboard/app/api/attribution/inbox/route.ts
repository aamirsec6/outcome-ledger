import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function GET() {
  const fallback = { pendingCount: 0, needsReview: false, reviewUrl: "/overview#attribution-inbox" };
  if (!API_URL) {
    return NextResponse.json(fallback);
  }
  try {
    const res = await fetch(`${API_URL}/v1/attribution/inbox`, {
      headers: await outcomeLedgerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(fallback);
  }
}
