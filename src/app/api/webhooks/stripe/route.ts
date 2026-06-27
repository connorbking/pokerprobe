import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import {
  createServer,
  getServersBySubscriptionId,
  getServersByUserId,
  updateServer,
  upsertUser,
  allocateServerSlug,
  type PlanId,
  type ServerType,
} from "@/lib/firestore-server";
import {
  autoProvisionServerDesktop,
  terminateServerRecord,
} from "@/lib/server-provision";
import { getProvisionTagsForPlan } from "@/lib/sim-catalog";
import { getProvisioningDefaults } from "@/lib/provision-defaults";
import { buildServerHostPart } from "@/lib/server-hostname";
import { getStripe, resolveCheckoutPlanId } from "@/lib/stripe";
import { subscriptionPeriodEnd } from "@/lib/stripe-billing";
import { extractPaidStorageBillingFromSubscription } from "@/lib/stripe-storage";
import { getIncludedVaultLimitGb } from "@/lib/storage-vault";
import { getHetznerSkuForPlan, getHetznerSkuForCustomBuild } from "@/lib/hetzner/plan-skus";
import { clearUserStorageSubaccount } from "@/lib/hetzner/storage";
import { provisionServerVault } from "@/lib/hetzner/vault";
import {
  getOmegaBuildFlavor,
  getPlanLabel,
} from "@/lib/plans";
import type { CustomBuildSpec } from "@/lib/firestore-server";

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

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const meta = session.metadata ?? subscription.metadata ?? {};

  const catalogPlan = resolveCheckoutPlanId({
    metadataPlanId: meta.planId,
    priceId,
  });
  const plan = catalogPlan as PlanId;
  const serverType: ServerType = "cloud";

  const customBuild = parseCustomBuildFromMetadata(meta);
  const sku =
    customBuild
      ? getHetznerSkuForCustomBuild(customBuild.flavorId)
      : getHetznerSkuForPlan(catalogPlan);

  const ovhFlavor =
    customBuild?.ovhFlavor ?? sku?.hetznerSku ?? null;

  const includedVaultGb =
    customBuild && getOmegaBuildFlavor(customBuild.flavorId)
      ? getOmegaBuildFlavor(customBuild.flavorId)!.includedVaultGb
      : getIncludedVaultLimitGb(catalogPlan);

  const user = await upsertUser(userId, userEmail, customerId);
  const userSlug = user.userSlug;

  const serverSlug = await allocateServerSlug();
  const hostname = buildServerHostPart(serverSlug);

  const originDefaults = await getProvisioningDefaults();

  const server = await createServer({
    userId,
    userEmail: userEmail.toLowerCase(),
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    plan,
    serverType,
    status: "pending",
    ip: originDefaults.defaultOriginIp,
    originPort: originDefaults.defaultOriginPort,
    hostname,
    serverSlug,
    userSlug,
    username: null,
    guacamoleUrl: null,
    hetznerServerId: null,
    hetznerType: ovhFlavor,
    ovhFlavor,
    customBuild,
    stripeStorageItemId: null,
    stripeStoragePriceId: null,
    storageLimitGB: includedVaultGb,
    linkedStorageBucket: null,
    uptimeStartedAt: null,
    label: `${getPlanLabel(catalogPlan)} server`,
    provisionedAt: null,
    canceledAt: null,
    notes: customBuild
      ? `Omega custom build: ${customBuild.vcpu} vCPU / ${customBuild.ramGb} GB RAM`
      : "",
    provisionTags: getProvisionTagsForPlan(catalogPlan),
    installedSims: [],
  });

  console.log(
    `[PROVISIONING NEEDED] serverId=${server.id} plan=${plan} userId=${userId} host=${hostname}.pokerprobe.com ip=${originDefaults.defaultOriginIp}:${originDefaults.defaultOriginPort ?? 443}`
  );

  try {
    const provision = await autoProvisionServerDesktop({
      serverId: server.id,
      serverSlug,
    });
    if (provision.skipped) {
      console.log("[AUTO PROVISION] skipped:", provision.reason);
    }
  } catch (err) {
    console.error("[AUTO PROVISION] failed:", err);
    await updateServer(server.id, {
      notes: `Auto DNS provision failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }

  try {
    const vault = await provisionServerVault({
      serverId: server.id,
      userId,
      planId: catalogPlan,
    });
    console.log(
      `[VAULT PROVISIONED] serverId=${server.id} home=${vault.homeDirectory} limitGb=${vault.storageLimitGB}`
    );
  } catch (err) {
    console.error("[VAULT PROVISION] failed:", err);
    await updateServer(server.id, {
      notes: `${server.notes ? `${server.notes} ` : ""}Vault provision failed: ${
        err instanceof Error ? err.message : String(err)
      }`.trim(),
    });
  }

  logManualProvisioning({
    type: "checkout.session.completed",
    data: { object: session },
  } as Stripe.Event);
}

function parseCustomBuildFromMetadata(
  meta: Record<string, string>
): CustomBuildSpec | null {
  const flavorId = meta.customBuildFlavorId;
  if (!flavorId) return null;

  const catalogFlavor = getOmegaBuildFlavor(flavorId);
  if (catalogFlavor) {
    return {
      flavorId: catalogFlavor.id,
      ovhFlavor: catalogFlavor.ovhFlavor,
      vcpu: catalogFlavor.vcpu,
      ramGb: catalogFlavor.ramGb,
      solverCacheGb: catalogFlavor.solverCacheGb,
      publicNetworkGbps: catalogFlavor.publicNetworkGbps,
      priceMonthlyUsd: catalogFlavor.price,
    };
  }

  const vcpu = Number(meta.customBuildVcpu);
  const ramGb = Number(meta.customBuildRamGb);
  const solverCacheGb = Number(meta.customBuildStorageGb);
  const priceMonthlyUsd = Number(meta.customBuildPriceUsd);

  if (!meta.customBuildOvhFlavor || !vcpu || !ramGb) {
    return null;
  }

  return {
    flavorId,
    ovhFlavor: meta.customBuildOvhFlavor,
    vcpu,
    ramGb,
    solverCacheGb: solverCacheGb || 0,
    publicNetworkGbps: 8,
    priceMonthlyUsd: priceMonthlyUsd || 0,
  };
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripe = getStripe();
  const fullSubscription = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price"],
  });

  const servers = await getServersBySubscriptionId(subscription.id);
  if (servers.length === 0) return;

  const periodEndUnix = subscriptionPeriodEnd(subscription);
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  const paidStorage = extractPaidStorageBillingFromSubscription(fullSubscription);

  for (const server of servers) {
    if (server.status === "terminated") continue;

    const patch: Parameters<typeof updateServer>[1] = {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEnd,
    };

    if (paidStorage) {
      patch.stripeStorageItemId = paidStorage.storageItemId;
      patch.stripeStoragePriceId = paidStorage.storagePriceId;
      patch.storageLimitGB = paidStorage.storageLimitGB;
    }

    if (subscription.status === "past_due" || subscription.status === "unpaid") {
      patch.status = "suspended";
    } else if (subscription.status === "active" && server.status === "suspended") {
      patch.status = "active";
    }

    await updateServer(server.id, patch);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const servers = await getServersBySubscriptionId(subscription.id);
  const userIds = new Set<string>();

  for (const server of servers) {
    userIds.add(server.userId);
    await terminateServerRecord(server);
  }

  for (const userId of userIds) {
    const remaining = (await getServersByUserId(userId)).filter(
      (s) => s.status !== "terminated"
    );
    if (remaining.length === 0) {
      try {
        await clearUserStorageSubaccount(userId);
      } catch (err) {
        console.error(
          `[SUBSCRIPTION DELETED] Storage subaccount cleanup failed for ${userId}:`,
          err
        );
      }
    }
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
