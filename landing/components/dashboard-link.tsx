"use client";

import { dashboardUrl } from "@/lib/app-urls";

type Props = {
  path?: string;
  className?: string;
  children: React.ReactNode;
};

/** Links to the app dashboard (separate Railway service). */
export function DashboardLink({ path = "/overview", className, children }: Props) {
  const href = `${dashboardUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return (
    <a href={href} className={className} rel="noopener noreferrer">
      {children}
    </a>
  );
}
