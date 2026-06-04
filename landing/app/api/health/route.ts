import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "outcome-ledger-landing",
    version: "0.1.0",
  });
}
