import { NextResponse } from "next/server";

const API = (
  process.env.OUTCOME_LEDGER_API_URL ||
  process.env.NEXT_PUBLIC_OUTCOME_LEDGER_API_URL ||
  "http://127.0.0.1:8090"
).replace(/\/$/, "");

export async function GET() {
  try {
    const res = await fetch(`${API}/v1/waitlist/stats`, { next: { revalidate: 30 } });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { signups: 0, cap: 50, spotsRemaining: 50, percentFull: 0, isOpen: true },
        { status: 200 }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      signups: 0,
      cap: 50,
      spotsRemaining: 50,
      percentFull: 0,
      isOpen: true,
    });
  }
}
