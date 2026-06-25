import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

function logManualProvisioning(event: Stripe.Event) {
  const timestamp = new Date().toISOString();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("[MANUAL PROVISIONING]", {
      timestamp,
      action: "NEW_SUBSCRIPTION",
      customerEmail: session.customer_details?.email ?? session.customer_email,
      customerId: session.customer,
      subscriptionId: session.subscription,
      planId: session.metadata?.planId,
      message:
        "Set up server manually, then add entry to src/data/customer-servers.json and redeploy.",
    });
    return;
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    console.log("[MANUAL PROVISIONING]", {
      timestamp,
      action: event.type,
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      planId: subscription.metadata?.planId,
      message:
        subscription.status === "canceled" || event.type === "customer.subscription.deleted"
          ? "Deactivate or suspend server manually. Update customer-servers.json."
          : "Review subscription change and adjust server resources if needed.",
    });
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      logManualProvisioning(event);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
