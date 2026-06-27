/**
 * Stripe storage vault upgrade billing — optional paid tiers added after initial purchase.
 * Included vault capacity is provisioned via Hetzner, not a Stripe line item at checkout.
 */

import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  getStorageVaultTierByPriceId,
  type StorageVaultTier,
} from "@/lib/storage-vault";

export interface StorageUpgradeResult {
  subscriptionId: string;
  storageItemId: string;
  storagePriceId: string;
  storageLimitGB: number;
}

export class StorageUpgradeError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_PRICE"
      | "MISSING_SUBSCRIPTION"
      | "STRIPE_ERROR"
      | "SAME_PRICE"
  ) {
    super(message);
    this.name = "StorageUpgradeError";
  }
}

function isPaidVaultTier(tier: StorageVaultTier): boolean {
  return tier.priceMonthlyUsd > 0;
}

function findStorageLineItem(
  subscription: Stripe.Subscription,
  storageItemId: string | null | undefined
): Stripe.SubscriptionItem | undefined {
  if (storageItemId) {
    const byId = subscription.items.data.find((item) => item.id === storageItemId);
    if (byId) return byId;
  }

  return subscription.items.data.find((item) => {
    const tier = getStorageVaultTierByPriceId(item.price.id);
    return tier != null && isPaidVaultTier(tier);
  });
}

export async function upgradeStorageSubscription(input: {
  stripeSubscriptionId: string | null | undefined;
  stripeStorageItemId: string | null | undefined;
  newStoragePriceId: string;
}): Promise<StorageUpgradeResult> {
  if (!input.stripeSubscriptionId) {
    throw new StorageUpgradeError(
      "Server is missing stripeSubscriptionId",
      "MISSING_SUBSCRIPTION"
    );
  }

  const tier = getStorageVaultTierByPriceId(input.newStoragePriceId);
  if (!tier || !isPaidVaultTier(tier)) {
    throw new StorageUpgradeError(
      `Unknown storage price: ${input.newStoragePriceId}`,
      "INVALID_PRICE"
    );
  }

  const stripe = getStripe();
  let subscription: Stripe.Subscription;

  try {
    subscription = await stripe.subscriptions.retrieve(input.stripeSubscriptionId, {
      expand: ["items.data.price"],
    });
  } catch (err) {
    throw new StorageUpgradeError(
      err instanceof Error ? err.message : "Failed to retrieve subscription",
      "STRIPE_ERROR"
    );
  }

  const storageItem = findStorageLineItem(
    subscription,
    input.stripeStorageItemId
  );

  if (storageItem?.price.id === input.newStoragePriceId) {
    throw new StorageUpgradeError(
      "Subscription already on this storage tier",
      "SAME_PRICE"
    );
  }

  try {
    if (storageItem) {
      await stripe.subscriptions.update(input.stripeSubscriptionId, {
        items: [{ id: storageItem.id, price: input.newStoragePriceId }],
        proration_behavior: "create_prorations",
      });
    } else {
      await stripe.subscriptions.update(input.stripeSubscriptionId, {
        items: [{ price: input.newStoragePriceId, quantity: 1 }],
        proration_behavior: "create_prorations",
      });
    }
  } catch (err) {
    throw new StorageUpgradeError(
      err instanceof Error ? err.message : "Stripe subscription update failed",
      "STRIPE_ERROR"
    );
  }

  const refreshed = await stripe.subscriptions.retrieve(input.stripeSubscriptionId, {
    expand: ["items.data.price"],
  });

  const updatedItem = findStorageLineItem(
    refreshed,
    storageItem?.id ?? input.stripeStorageItemId
  );
  if (!updatedItem) {
    throw new StorageUpgradeError(
      "Storage line item missing after upgrade",
      "STRIPE_ERROR"
    );
  }

  return {
    subscriptionId: refreshed.id,
    storageItemId: updatedItem.id,
    storagePriceId: updatedItem.price.id,
    storageLimitGB: tier.limitGB,
  };
}

/** Paid vault line item on subscription, if the customer upgraded */
export function extractPaidStorageBillingFromSubscription(
  subscription: Stripe.Subscription
): { storageItemId: string; storagePriceId: string; storageLimitGB: number } | null {
  const item = findStorageLineItem(subscription, null);
  if (!item) return null;

  const tier = getStorageVaultTierByPriceId(item.price.id);
  if (!tier || !isPaidVaultTier(tier)) {
    return null;
  }

  return {
    storageItemId: item.id,
    storagePriceId: item.price.id,
    storageLimitGB: tier.limitGB,
  };
}
