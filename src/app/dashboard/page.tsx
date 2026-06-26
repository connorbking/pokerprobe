import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server-auth";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  return <DashboardClient />;
}
