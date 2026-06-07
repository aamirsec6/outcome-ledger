import { NextRequest, NextResponse } from "next/server";

function adminConfig() {
  const apiUrl = (
    process.env.ADMIN_API_URL ||
    process.env.NEXT_PUBLIC_ADMIN_API_URL ||
    ""
  ).replace(/\/$/, "");
  const token =
    process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";
  return { apiUrl, token };
}

async function proxy(req: NextRequest, path: string[]) {
  const { apiUrl, token } = adminConfig();
  if (!apiUrl || !token) {
    return NextResponse.json(
      { error: "Admin API not configured (ADMIN_API_URL / ADMIN_TOKEN)" },
      { status: 503 },
    );
  }

  const suffix = path.join("/");
  const qs = req.nextUrl.search;
  const target = `${apiUrl}/admin/v1/admin/${suffix}${qs}`;

  const res = await fetch(target, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
    },
    cache: "no-store",
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
