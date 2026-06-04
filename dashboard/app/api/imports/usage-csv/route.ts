import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";
import { getTenantApiKey } from "@/lib/tenant-session";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

export async function POST(request: Request) {
  const key = await getTenantApiKey();
  if (!API_URL || !key) {
    return NextResponse.json(
      { ok: false, error: "API not configured on dashboard service" },
      { status: 503 },
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  const source = (incoming.get("source") as string) || "csv";

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "Missing CSV file" }, { status: 400 });
  }

  const body = new FormData();
  body.append("file", file, "usage.csv");
  body.append("source", source);

  const headers = await outcomeLedgerHeaders();
  const res = await fetch(`${API_URL}/v1/imports/usage-csv`, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
