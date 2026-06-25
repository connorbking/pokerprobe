import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getStripe, getPriceId } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { planId } = await request.json();
    const priceId = getPriceId(planId);

    if (!priceId || priceId.startsWith("price_...")) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured yet. Set STRIPE_PRICE_* env variables.",
        },
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
      subscription_data: {
        metadata: { planId, userId: user.uid },
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
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
