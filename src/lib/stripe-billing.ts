import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export function subscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  const fromItem = subscription.items.data[0]?.current_period_end;
  if (fromItem) return fromItem;

  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  return legacy ?? null;
}

export interface SubscriptionBillingView {
  subscriptionId: string;
  status: Stripe.Subscription.Status;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

export async function getSubscriptionBillingView(
  subscriptionId: string
): Promise<SubscriptionBillingView> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: (() => {
      const end = subscriptionPeriodEnd(subscription);
      return end ? new Date(end * 1000).toISOString() : null;
    })(),
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };
}

export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<SubscriptionBillingView> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: (() => {
      const end = subscriptionPeriodEnd(subscription);
      return end ? new Date(end * 1000).toISOString() : null;
    })(),
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };
}

export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<void> {
  const stripe = getStripe();
  await stripe.subscriptions.cancel(subscriptionId);
}
