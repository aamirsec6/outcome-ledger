/** Public URLs for cross-linking landing ↔ dashboard (set on Railway). */
export function dashboardUrl(): string {
  return (
    process.env.NEXT_PUBLIC_DASHBOARD_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}
