import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server-auth";
import { getPlanById, normalizePlanId } from "@/lib/plans";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const normalized = normalizePlanId(planId);

  if (normalized === "omega") {
    redirect("/dashboard/checkout/omega");
  }

  if (normalized && normalized !== planId) {
    redirect(`/dashboard/checkout/${normalized}`);
  }

  const plan = getPlanById(planId);

  if (!plan || plan.customBuild) {
    redirect("/dashboard/plans");
  }

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/dashboard/checkout/${plan.id}`)}`
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <CheckoutClient planId={plan.id} />
    </div>
  );
}
