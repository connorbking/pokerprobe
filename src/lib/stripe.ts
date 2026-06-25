import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
}

export function getPriceId(planId: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE,
    baremetal: process.env.STRIPE_PRICE_BAREMETAL,
  };
  return map[planId] ?? null;
}

export function planFromPriceId(priceId: string): string | null {
  const pairs: Array<[string | undefined, string]> = [
    [process.env.STRIPE_PRICE_STARTER, "starter"],
    [process.env.STRIPE_PRICE_PRO, "pro"],
    [process.env.STRIPE_PRICE_ELITE, "elite"],
    [process.env.STRIPE_PRICE_BAREMETAL, "baremetal"],
  ];

  for (const [envPrice, plan] of pairs) {
    if (envPrice && envPrice === priceId) return plan;
  }
  return null;
}
