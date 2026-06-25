import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getStripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const stripe = getStripe();

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.data[0];
    if (!customer) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${siteConfig.url}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json(
      { error: "Failed to open billing portal" },
      { status: 500 }
    );
  }
}
