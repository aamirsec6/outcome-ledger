import type { Metadata } from "next";
import { OutcomeLanding } from "@/components/outcome-landing";

export const metadata: Metadata = {
  title: "Outcome Ledger — Cost per accepted outcome",
  description:
    "Value accounting for AI-assisted engineering. CPST, outcome contracts, and board-ready exports.",
  openGraph: {
    title: "Outcome Ledger — CPST for AI engineering ROI",
    description:
      "Connect AI spend to stable merged wins. The value accounting layer finance can trust.",
  },
};

export default function HomePage() {
  return <OutcomeLanding />;
}
