import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ONBOARDING_COOKIE } from "@/lib/onboarding-gate";

const TENANT_COOKIE = "ol_tenant_api_key";

const isAuthPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join(.*)",
  "/api/health(.*)",
  "/api/waitlist(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

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

async function onboardingComplete(request: NextRequest): Promise<boolean> {
  if (request.cookies.get(ONBOARDING_COOKIE)?.value === "1") {
    return true;
  }
  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/tenant/onboarding`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return Boolean(data.complete);
}

const useClerk = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").trim(),
);

export default useClerk
  ? clerkMiddleware(async (auth, request) => {
      const { pathname } = request.nextUrl;

      if (isAuthPublicRoute(request)) {
        return;
      }

      await auth.protect();

      if (isOnboardingRoute(request)) {
        return;
      }

      if (pathname.startsWith("/api/")) {
        return;
      }

      const complete = await onboardingComplete(request);
      if (!complete) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        if (pathname !== "/") {
          url.searchParams.set("next", pathname);
        }
        return NextResponse.redirect(url);
      }
    })
  : legacyMiddleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
