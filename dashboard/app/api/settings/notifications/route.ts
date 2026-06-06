import { NextResponse } from "next/server";
import { outcomeLedgerHeaders } from "@/lib/api-headers";

const API_URL = (process.env.OUTCOME_LEDGER_API_URL || "").replace(/\/$/, "");

const fallback = {
  settings: {
    slackWebhookUrl: "",
    slackAlertsEnabled: false,
    slackWebhookConfigured: false,
    digestEmails: [],
    digestEnabled: false,
    monthlyBudgetUsd: 0,
    budgetAlertThresholdPct: 80,
    githubPrCommentsEnabled: false,
    alertOnCpstSpike: true,
    alertOnBudgetBurn: true,
    alertOnInbox: true,
  },
};

export async function GET() {
  if (!API_URL) {
    return NextResponse.json(fallback);
  }
  try {
    const res = await fetch(`${API_URL}/v1/settings/notifications`, {
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

export async function PUT(req: Request) {
  if (!API_URL) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }
  const body = await req.json();
  const res = await fetch(`${API_URL}/v1/settings/notifications`, {
    method: "PUT",
    headers: {
      ...(await outcomeLedgerHeaders()),
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
