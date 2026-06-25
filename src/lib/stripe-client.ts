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
