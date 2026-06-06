import type { Metadata } from "next";
import { OutcomeLanding } from "@/components/outcome-landing";

export const metadata: Metadata = {
  title: "Outcome Ledger | Know what each AI win cost",
  description:
    "The value layer between AI spend and real wins. Connect bills to shipped work. See cost per win in plain numbers leadership can trust.",
  openGraph: {
    title: "Outcome Ledger | Prove what each AI win cost",
    description:
      "AI tools show spend. Outcome Ledger shows cost per win. The missing layer between your bills and customer outcomes.",
  },
};

export default function HomePage() {
  return <OutcomeLanding />;
}
