import { loadStripe, type Stripe } from "@stripe/stripe-js";

const stripePromises = new Map<string, Promise<Stripe | null>>();

export function getStripePromise(publishableKey: string | undefined) {
  const key = publishableKey?.trim();
  if (!key) return null;

  let promise = stripePromises.get(key);
  if (!promise) {
    promise = loadStripe(key);
    stripePromises.set(key, promise);
  }
  return promise;
}

/** Read publishable key on the server (runtime env on Cloudflare Workers). */
export function getStripePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ??
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ??
    ""
  );
}
