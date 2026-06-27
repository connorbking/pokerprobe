import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server-auth";
import { OmegaCheckoutClient } from "./OmegaCheckoutClient";

export const metadata: Metadata = {
  title: "Build Omega Server",
};

export default async function OmegaCheckoutPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/signin?callbackUrl=/dashboard/checkout/omega");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <OmegaCheckoutClient />
    </div>
  );
}
