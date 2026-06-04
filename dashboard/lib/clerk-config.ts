/** True when Clerk powers dashboard auth (multi-tenant SaaS). */

export function isClerkEnabled(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").trim(),
  );
}
