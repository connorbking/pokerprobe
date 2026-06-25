import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server-auth";
import { ChoosePlanSection } from "@/components/ChoosePlanSection";

export const metadata: Metadata = {
  title: "Choose a Plan",
};

export default async function DashboardPlansPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/signin?callbackUrl=/dashboard/plans");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <ChoosePlanSection />
    </div>
  );
}
