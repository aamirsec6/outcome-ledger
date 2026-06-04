import { NextResponse } from "next/server";
import { saveGithubRepos } from "@/lib/github-api";

export async function POST(request: Request) {
  const body = await request.json();
  const repos = Array.isArray(body.repos) ? body.repos : [];
  const result = await saveGithubRepos(repos);
  if (result.ok === false) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
