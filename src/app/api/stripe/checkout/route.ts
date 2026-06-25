import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getStripe, getPriceId } from "@/lib/stripe";

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

    const body = (await request.json()) as { planId?: string };
    const planId = body.planId;
    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const priceId = getPriceId(planId);

    if (!priceId) {
      return NextResponse.json(
        { error: "Unknown plan or Stripe is not configured." },
        { status: 503 }
      );
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

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      ui_mode: "embedded",
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: user.uid,
        userEmail: user.email,
        planId: priceId,
      },
      subscription_data: {
        metadata: {
          userId: user.uid,
          userEmail: user.email,
          planId: priceId,
        },
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
