import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server-auth";
import { getPlanById } from "@/lib/config";
import { CheckoutClient } from "./CheckoutClient";
import { getStripePublishableKey } from "@/lib/stripe-client";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const plan = getPlanById(planId);

  if (!plan) {
    redirect("/dashboard/plans");
  }

  const user = await getServerUser();
  if (!user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/dashboard/checkout/${planId}`)}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <CheckoutClient
        planId={planId}
        publishableKey={getStripePublishableKey()}
      />
    </div>
  );
}
