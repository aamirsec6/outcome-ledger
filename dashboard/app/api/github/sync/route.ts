import { NextResponse } from "next/server";
import { syncGithub } from "@/lib/github-api";

export async function POST() {
  const result = await syncGithub();
  if (result.ok === false) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
