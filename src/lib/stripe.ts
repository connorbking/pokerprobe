import Stripe from "stripe";

/** Stripe Price IDs — Study / Solver / Farm */
export const STRIPE_PRICE_IDS = {
  starter: "price_1TmHyaIjjUzEL2aMgI3SKxkr",
  pro: "price_1TmHyaIjjUzEL2aM5EEon6Xj",
  elite: "price_1TmHyaIjjUzEL2aM2PRygnj3",
} as const;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getPriceId(planId: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: STRIPE_PRICE_IDS.starter,
    pro: STRIPE_PRICE_IDS.pro,
    elite: STRIPE_PRICE_IDS.elite,
    baremetal: process.env.STRIPE_PRICE_BAREMETAL,
  };
  return map[planId] ?? null;
}

export function planFromPriceId(priceId: string): string | null {
  const pairs: Array<[string | undefined, string]> = [
    [STRIPE_PRICE_IDS.starter, "starter"],
    [STRIPE_PRICE_IDS.pro, "pro"],
    [STRIPE_PRICE_IDS.elite, "elite"],
    [process.env.STRIPE_PRICE_BAREMETAL, "baremetal"],
  ];

  for (const [envPrice, plan] of pairs) {
    if (envPrice && envPrice === priceId) return plan;
  }
  return null;
}
