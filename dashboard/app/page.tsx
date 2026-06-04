import { redirect } from "next/navigation";

/** App service — marketing lives on `landing` Railway service. */
export default function RootPage() {
  redirect("/overview");
}
