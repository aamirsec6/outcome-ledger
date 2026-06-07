"use client";

import { UserButton } from "@clerk/nextjs";
import { SignOutButton } from "@/components/sign-out-button";

/** Optional compact account chip — primary logout is sidebar + top bar. */
export function ClerkUserMenu() {
  return (
    <div className="flex items-center gap-2 px-2">
      <UserButton afterSignOutUrl="/sign-in" />
      <SignOutButton variant="sidebar" />
    </div>
  );
}
