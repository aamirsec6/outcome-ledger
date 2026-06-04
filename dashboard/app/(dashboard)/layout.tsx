import { redirect } from "next/navigation";
import { requireOnboardingComplete } from "@/lib/onboarding-gate";

/** Server-side onboarding gate (Node runtime — no edge fetch). */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await requireOnboardingComplete();
  if (!gate.complete) {
    redirect("/onboarding");
  }
  return children;
}
