import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outcome Ledger Admin",
  description: "Analytics, onboarding funnel, retention",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
      </body>
    </html>
  );
}
