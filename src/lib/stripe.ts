import Stripe from "stripe";
import { normalizePlanId, type PlanId } from "@/lib/plans";

/** Stripe Price IDs — Hobby / Grind / Deep Stack (Omega uses dynamic checkout) */
export const STRIPE_PRICE_IDS = {
  hobby:
    process.env.STRIPE_PRICE_HOBBY ??
    process.env.STRIPE_PRICE_STARTER ??
    "",
  grind:
    process.env.STRIPE_PRICE_GRIND ?? process.env.STRIPE_PRICE_PRO ?? "",
  deepstack:
    process.env.STRIPE_PRICE_DEEPSTACK ??
    process.env.STRIPE_PRICE_ELITE ??
    "",
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
  const normalized = normalizePlanId(planId);
  if (!normalized || normalized === "omega") return null;

  const map: Record<Exclude<PlanId, "omega">, string | undefined> = {
    hobby: STRIPE_PRICE_IDS.hobby,
    grind: STRIPE_PRICE_IDS.grind,
    deepstack: STRIPE_PRICE_IDS.deepstack,
  };

  return map[normalized] || null;
}

export function planFromPriceId(priceId: string): PlanId | null {
  const pairs: Array<[string | undefined, PlanId]> = [
    [STRIPE_PRICE_IDS.hobby, "hobby"],
    [STRIPE_PRICE_IDS.grind, "grind"],
    [STRIPE_PRICE_IDS.deepstack, "deepstack"],
    [process.env.STRIPE_PRICE_STARTER, "hobby"],
    [process.env.STRIPE_PRICE_PRO, "grind"],
    [process.env.STRIPE_PRICE_ELITE, "deepstack"],
    [process.env.STRIPE_PRICE_ENTERPRISE, "omega"],
    [process.env.STRIPE_PRICE_BAREMETAL, "omega"],
    // Legacy hardcoded test prices
    ["price_1TmHyaIjjUzEL2aMgI3SKxkr", "hobby"],
    ["price_1TmHyaIjjUzEL2aM5EEon6Xj", "grind"],
    ["price_1TmHyaIjjUzEL2aM2PRygnj3", "deepstack"],
  ];

  for (const [envPrice, plan] of pairs) {
    if (envPrice && envPrice === priceId) return plan;
  }
  return null;
}

export function resolveCheckoutPlanId(input: {
  metadataPlanId?: string | null;
  priceId?: string | null;
}): PlanId {
  const fromMeta = input.metadataPlanId
    ? normalizePlanId(input.metadataPlanId)
    : null;
  if (fromMeta) return fromMeta;

  if (input.priceId) {
    const fromPrice = planFromPriceId(input.priceId);
    if (fromPrice) return fromPrice;
  }

  return "hobby";
}
