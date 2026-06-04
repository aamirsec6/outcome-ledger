import type { Metadata } from "next";
import { WaitlistLanding } from "@/components/waitlist-landing";

export const metadata: Metadata = {
  title: "Join the waitlist — Outcome Ledger",
  description:
    "Cost per accepted outcome (CPST) for AI-assisted engineering. Join the design partner waitlist.",
  openGraph: {
    title: "Outcome Ledger — CPST for AI engineering ROI",
    description:
      "Connect AI spend to stable merged wins. Board-ready CPST before your budget review.",
  },
};

export default function JoinPage() {
  return <WaitlistLanding />;
}
