import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import {
  createServer,
  getServersBySubscriptionId,
  updateServer,
  upsertUser,
  updateUserStripeCustomerId,
  type PlanId,
  type ServerType,
} from "@/lib/firestore-server";
import { getProvisionTagsForPlan } from "@/lib/sim-catalog";
import { getStripe, planFromPriceId } from "@/lib/stripe";

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
      message: "Server record created in Firestore with status pending.",
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
          ? "Server marked terminated in Firestore."
          : "Subscription change synced to Firestore.",
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripe();

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error("[WEBHOOK] checkout.session.completed missing customer/subscription");
    return;
  }

  const userId = session.metadata?.userId;
  const userEmail =
    session.metadata?.userEmail ??
    session.customer_details?.email ??
    session.customer_email;

  if (!userId || !userEmail) {
    console.error("[WEBHOOK] checkout.session.completed missing userId/userEmail metadata");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id ?? session.metadata?.planId ?? "";
  const planSlug = planFromPriceId(priceId) ?? "starter";
  const plan = planSlug as PlanId;
  const serverType: ServerType = plan === "baremetal" ? "dedicated" : "cloud";

  await upsertUser(userId, userEmail, customerId);
  await updateUserStripeCustomerId(userId, customerId);

  const planLabels: Record<PlanId, string> = {
    starter: "Study",
    pro: "Solver",
    elite: "Farm",
    baremetal: "Bare Metal",
  };

  const server = await createServer({
    userId,
    userEmail,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    plan,
    serverType,
    status: "pending",
    ip: null,
    hostname: null,
    username: null,
    guacamoleUrl: null,
    hetznerServerId: null,
    label: `${planLabels[plan]} server`,
    provisionedAt: null,
    canceledAt: null,
    notes: "",
    provisionTags: getProvisionTagsForPlan(plan),
    installedSims: [],
  });

  console.log(
    `[PROVISIONING NEEDED] serverId=${server.id} plan=${plan} userId=${userId}`
  );

  logManualProvisioning({
    type: "checkout.session.completed",
    data: { object: session },
  } as Stripe.Event);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const servers = await getServersBySubscriptionId(subscription.id);
  if (servers.length === 0) return;

  const status = subscription.status;
  let nextStatus: "active" | "suspended" | null = null;

  if (status === "past_due" || status === "unpaid") {
    nextStatus = "suspended";
  } else if (status === "active") {
    nextStatus = "active";
  }

  if (!nextStatus) return;

  for (const server of servers) {
    if (server.status === "terminated") continue;

    if (nextStatus === "suspended") {
      await updateServer(server.id, { status: "suspended" });
    } else if (
      nextStatus === "active" &&
      server.status === "suspended"
    ) {
      await updateServer(server.id, { status: "active" });
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const servers = await getServersBySubscriptionId(subscription.id);
  const canceledAt = new Date().toISOString();

  for (const server of servers) {
    await updateServer(server.id, {
      status: "terminated",
      canceledAt,
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

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        logManualProvisioning(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        logManualProvisioning(event);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
