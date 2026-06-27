"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { usePublicConfig } from "@/context/PublicConfigContext";
import { getStripePromise } from "@/lib/stripe-client";
import { enterprisePlan, omegaBuildFlavors } from "@/lib/plans";

export function OmegaCheckoutClient() {
  const { stripePublishableKey } = usePublicConfig();
  const [selectedFlavorId, setSelectedFlavorId] = useState(
    omegaBuildFlavors[0]?.id ?? ""
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const selected = omegaBuildFlavors.find((f) => f.id === selectedFlavorId) ?? null;

  useEffect(() => {
    setClientSecret(null);
    setError(null);
  }, [selectedFlavorId]);

  const stripePromise = getStripePromise(stripePublishableKey);

  async function startCheckout() {
    if (!selected) return;
    setLoadingCheckout(true);
    setError(null);
    setClientSecret(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "omega",
          customBuild: { flavorId: selected.id },
        }),
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        clientSecret?: string;
        error?: string;
      };

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.error ?? "Unable to start checkout");
      }
    } catch {
      setError("Unable to start checkout");
    } finally {
      setLoadingCheckout(false);
    }
  }

  if (!stripePromise) {
    return (
      <p className="text-gray-400">
        Stripe is not configured. Add{" "}
        <code className="text-gold-400">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
        to Cloudflare Variables and secrets.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-gold-400">
          Custom build
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">
          Build your Omega server
        </h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          Select vCPU, RAM, and NVMe for your solver workload. Pricing updates
          instantly — checkout when you are ready.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {omegaBuildFlavors.map((flavor) => {
          const active = flavor.id === selectedFlavorId;
          return (
            <button
              key={flavor.id}
              type="button"
              onClick={() => setSelectedFlavorId(flavor.id)}
              className={`rounded-xl border p-5 text-left transition ${
                active
                  ? "border-gold-400/50 bg-gold-400/5"
                  : "border-white/10 bg-felt-800/40 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-white">{flavor.label}</h2>
                <span className="text-sm font-bold text-gold-400">
                  ${flavor.price}/mo
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {flavor.vcpu} vCPU · {flavor.ramGb} GB RAM
              </p>
              <ul className="mt-4 space-y-1 text-sm text-gray-300">
                <li>{flavor.vcpu} vCPU · {flavor.ramGb} GB RAM</li>
                <li>{flavor.solverCacheGb} GB NVMe solver cache</li>
                <li>{flavor.publicNetworkGbps} Gbps public network</li>
                <li>
                  {flavor.includedVaultGb >= 1024
                    ? `${flavor.includedVaultGb / 1024} TB`
                    : `${flavor.includedVaultGb} GB`}{" "}
                  cloud vault included
                </li>
              </ul>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-8 rounded-xl border border-white/10 bg-felt-800/40 p-6">
          <h3 className="text-lg font-semibold text-white">Your build summary</h3>
          <p className="mt-2 text-gray-300">
            {selected.label} · {selected.vcpu} vCPU / {selected.ramGb} GB RAM ·{" "}
            {selected.solverCacheGb} GB NVMe
          </p>
          <p className="mt-1 text-2xl font-bold text-gold-400">
            ${selected.price}
            <span className="text-base font-normal text-gray-500">/month</span>
          </p>

          {!clientSecret && (
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={loadingCheckout}
              className="mt-6 rounded-xl bg-gold-500 px-6 py-3 text-sm font-semibold text-felt-950 transition hover:bg-gold-400 disabled:opacity-60"
            >
              {loadingCheckout ? "Starting checkout…" : "Continue to checkout"}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {clientSecret && (
        <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-felt-800/40">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        Need something off-catalog?{" "}
        <a
          href={`mailto:${enterprisePlan.contactEmail}?subject=${encodeURIComponent(enterprisePlan.contactSubject)}`}
          className="text-gold-400 hover:underline"
        >
          Contact us
        </a>{" "}
        ·{" "}
        <Link href="/dashboard/plans" className="text-gold-400 hover:underline">
          ← Back to plans
        </Link>
      </p>
    </div>
  );
}
