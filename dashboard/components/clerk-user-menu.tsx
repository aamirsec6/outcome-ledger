"use client";

import { UserButton } from "@clerk/nextjs";

export function ClerkUserMenu() {
  return (
    <div className="mt-auto border-t border-[var(--border)] px-2 pt-4">
      <UserButton afterSignOutUrl="/sign-in" />
    </div>
  );
}
