import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Outcome Ledger — CPST for developers",
  description:
    "The best way to tie AI spend to accepted engineering outcomes. Deliver board-ready CPST at scale.",
  openGraph: {
    title: "Outcome Ledger — CPST for developers",
    description:
      "Connect AI spend to stable merged wins. Deterministic value accounting finance can trust.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
