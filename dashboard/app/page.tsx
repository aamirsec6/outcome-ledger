import { redirect } from "next/navigation";
import { requireOnboardingComplete } from "@/lib/onboarding-gate";

/** After sign-in, send users to setup until onboarding is complete. */
export default async function RootPage() {
  const gate = await requireOnboardingComplete();
  if (!gate.complete) {
    redirect("/onboarding");
  }
  redirect("/overview");
}
