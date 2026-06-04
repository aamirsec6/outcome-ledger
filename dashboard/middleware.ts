import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TENANT_COOKIE = "ol_tenant_api_key";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/join(.*)",
  "/api/health(.*)",
  "/api/waitlist(.*)",
  "/api/tenant/clerk-bootstrap(.*)",
]);

const legacyPublicPrefixes = [
  "/onboarding",
  "/api/tenant",
  "/api/github/connect",
  "/api/health",
  "/join",
];

function isLegacyPublicPath(pathname: string): boolean {
  return legacyPublicPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function legacyMiddleware(request: NextRequest) {
  if (process.env.OUTCOME_LEDGER_API_KEY?.trim()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isLegacyPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(request.cookies.get(TENANT_COOKIE)?.value?.trim());
  if (!hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

const useClerk = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").trim(),
);

export default useClerk
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : legacyMiddleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
