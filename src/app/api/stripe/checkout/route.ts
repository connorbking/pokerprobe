import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import {
  getOmegaBuildFlavor,
  getPlanById,
  getStripeProductName,
  isCheckoutPlanId,
  normalizePlanId,
} from "@/lib/plans";
import { getStripe, getPriceId } from "@/lib/stripe";

interface CheckoutBody {
  planId?: string;
  customBuild?: { flavorId?: string };
}

function checkoutErrorMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    return err.message;
  }
  if (err instanceof Error) {
    if (err.message === "STRIPE_SECRET_KEY is not set") {
      return "Stripe secret key is not configured on the server.";
    }
    return err.message;
  }
  return "Failed to create checkout session";
}

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutBody;
    const planId = body.planId;
    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const normalized = normalizePlanId(planId);
    if (!normalized || !isCheckoutPlanId(normalized)) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const stripe = getStripe();
    const origin = new URL(request.url).origin;

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.uid },
      });
      customerId = customer.id;
    }

    const baseMetadata: Record<string, string> = {
      userId: user.uid,
      userEmail: user.email,
      planId: normalized,
    };

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (normalized === "omega") {
      const flavorId = body.customBuild?.flavorId;
      const flavor = flavorId ? getOmegaBuildFlavor(flavorId) : null;
      if (!flavor) {
        return NextResponse.json(
          { error: "Select a valid Omega build configuration." },
          { status: 400 }
        );
      }

      baseMetadata.customBuildFlavorId = flavor.id;
      baseMetadata.customBuildOvhFlavor = flavor.ovhFlavor;
      baseMetadata.customBuildVcpu = String(flavor.vcpu);
      baseMetadata.customBuildRamGb = String(flavor.ramGb);
      baseMetadata.customBuildStorageGb = String(flavor.solverCacheGb);
      baseMetadata.customBuildPriceUsd = String(flavor.price);

      lineItems = [
        {
          price_data: {
            currency: "usd",
            unit_amount: flavor.price * 100,
            recurring: { interval: "month" },
            product_data: {
              name: `${getStripeProductName("omega")} — ${flavor.label}`,
              description: `${flavor.label}: ${flavor.vcpu} vCPU / ${flavor.ramGb} GB RAM / ${flavor.solverCacheGb} GB NVMe`,
              metadata: {
                app: "pokerprobe",
                planId: "omega",
                flavorId: flavor.id,
                ovhFlavor: flavor.ovhFlavor,
              },
            },
          },
          quantity: 1,
        },
      ];
    } else {
      const priceId = getPriceId(normalized);
      if (!priceId) {
        return NextResponse.json(
          { error: "Unknown plan or Stripe is not configured." },
          { status: 503 }
        );
      }

      const plan = getPlanById(normalized)!;
      baseMetadata.stripePriceId = priceId;

      lineItems = [{ price: priceId, quantity: 1 }];
      void plan;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      ui_mode: "embedded",
      line_items: lineItems,
      return_url: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: baseMetadata,
      subscription_data: {
        metadata: baseMetadata,
      },
    });

    if (!checkoutSession.client_secret) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: checkoutErrorMessage(err) },
      { status: 500 }
    );
  }
}
