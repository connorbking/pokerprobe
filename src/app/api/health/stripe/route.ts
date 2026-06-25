import { NextResponse } from "next/server";
import { STRIPE_PRICE_IDS, getStripe } from "@/lib/stripe";

export async function GET() {
  const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const hasPublishableKey = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  );

  let secretKeyWorks = false;
  let priceLookupOk = false;
  let stripeError: string | undefined;

  if (hasSecretKey) {
    try {
      const stripe = getStripe();
      const price = await stripe.prices.retrieve(STRIPE_PRICE_IDS.starter);
      secretKeyWorks = true;
      priceLookupOk = price.active === true;
    } catch (err) {
      stripeError =
        err instanceof Error ? err.message : "Stripe API request failed";
    }
  }

  return NextResponse.json({
    stripe: {
      configured: hasSecretKey && secretKeyWorks && priceLookupOk,
      hasSecretKey,
      hasPublishableKey,
      secretKeyWorks,
      priceLookupOk,
      error: stripeError,
      hint: !hasSecretKey
        ? "Set STRIPE_SECRET_KEY as a Secret in runtime Variables and secrets."
        : stripeError?.includes("No such price")
          ? "STRIPE_SECRET_KEY is from a different Stripe account than the hardcoded price IDs."
          : stripeError
            ? "Check STRIPE_SECRET_KEY permissions (Checkout Sessions Write, Customers Write, Prices Read)."
            : undefined,
    },
  });
}
