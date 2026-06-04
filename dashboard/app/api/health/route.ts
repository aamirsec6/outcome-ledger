import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "outcome-ledger-dashboard",
    version: "0.1.0",
  });
}
