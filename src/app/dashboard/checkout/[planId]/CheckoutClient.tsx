"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { usePublicConfig } from "@/context/PublicConfigContext";
import { getStripePromise } from "@/lib/stripe-client";
import { enterprisePlan, getPlanById } from "@/lib/plans";

export function CheckoutClient({ planId }: { planId: string }) {
  const { stripePublishableKey } = usePublicConfig();
  const plan = getPlanById(planId);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCheckout() {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          clientSecret?: string;
          error?: string;
        };

        if (cancelled) return;

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error ?? "Unable to start checkout");
        }
      } catch {
        if (!cancelled) {
          setError("Unable to start checkout");
        }
      }
    }

    void startCheckout();

    return () => {
      cancelled = true;
    };
  }, [planId]);

  const stripePromise = getStripePromise(stripePublishableKey);

  if (!plan) {
    return (
      <p className="text-gray-400">
        Unknown plan.{" "}
        <Link href="/dashboard/plans" className="text-gold-400 hover:underline">
          Choose a plan
        </Link>
      </p>
    );
  }

  if (!stripePromise) {
    return (
      <p className="text-gray-400">
        Stripe is not configured. Add{" "}
        <code className="text-gold-400">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
        to Cloudflare Variables and secrets (runtime).
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-gold-400">
          Secure checkout
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Subscribe to {plan.name}
        </h1>
        <p className="mt-2 text-gray-400">
          ${plan.price}/month · {plan.description}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!clientSecret && !error && (
        <div className="rounded-xl border border-white/10 bg-felt-800/40 px-6 py-12 text-center text-gray-400">
          Loading checkout…
        </div>
      )}

      {clientSecret && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-felt-800/40">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        <Link href="/dashboard/plans" className="text-gold-400 hover:underline">
          ← Back to plans
        </Link>
      </p>
    </div>
  );
}
