import { NextResponse } from "next/server";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.OUTCOME_LEDGER_API_KEY || "";

export async function POST(request: Request) {
  if (!API_URL || !API_KEY) {
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

  const res = await fetch(`${API_URL}/v1/imports/usage-csv`, {
    method: "POST",
    headers: { "X-Api-Key": API_KEY },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
