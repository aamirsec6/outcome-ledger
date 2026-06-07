"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { isClerkEnabled } from "@/lib/clerk-config";

type Props = {
  className?: string;
  variant?: "sidebar" | "topbar";
};

export function SignOutButton({ className = "", variant = "topbar" }: Props) {
  if (!isClerkEnabled()) {
    return null;
  }

  const base =
    variant === "sidebar"
      ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm theme-text-muted transition-colors hover:bg-[var(--bg-hover)] hover:theme-text"
      : "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm theme-text-muted transition-colors hover:bg-[var(--bg-hover)]";

  return (
    <ClerkSignOutButton>
      <button type="button" className={`${base} ${className}`}>
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </ClerkSignOutButton>
  );
}
