"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { enterprisePlan, pricingPlans } from "@/lib/plans";
import { siteConfig } from "@/lib/config";

export function Pricing() {
  const { user, loading } = useAuth();

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Simple Monthly Pricing
          </h2>
          <p className="mt-4 text-gray-400">
            OVH Public Cloud instances sized for the tools on our platform.
            Cancel anytime from your dashboard.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            {siteConfig.dualZoneStorageNote}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan) => {
            const checkoutHref =
              plan.id === "omega"
                ? "/dashboard/checkout/omega"
                : `/dashboard/checkout/${plan.id}`;
            const signInHref = `/signin?callbackUrl=${encodeURIComponent(checkoutHref)}`;

            return (
              <div
                key={plan.id}
                className={`card-glow flex flex-col rounded-2xl border p-6 sm:p-8 ${
                  plan.highlighted
                    ? "border-gold-400/40 bg-felt-800/80"
                    : "border-white/5 bg-felt-800/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-xs font-medium text-gray-500">
                      {plan.customBuild ? "Custom build" : plan.ovhFlavor}
                    </p>
                  </div>
                  {plan.highlighted && (
                    <span className="shrink-0 rounded-full bg-gold-500 px-3 py-0.5 text-xs font-semibold text-felt-950">
                      Most Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
                <p className="mt-2 text-xs font-medium text-gold-400/80">
                  {plan.idealFor}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  {plan.customBuild ? (
                    <>
                      <span className="text-lg text-gray-400">From</span>
                      <span className="text-4xl font-bold text-gold-400">
                        ${enterprisePlan.startingPrice}
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-gold-400">
                      ${plan.price}
                    </span>
                  )}
                  <span className="text-gray-500">/mo</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <span className="mt-0.5 text-gold-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {!loading && user ? (
                  <Link
                    href={checkoutHref}
                    className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                      plan.highlighted
                        ? "bg-gold-500 text-felt-950 hover:bg-gold-400"
                        : "border border-white/15 text-white hover:bg-white/5"
                    }`}
                  >
                    {plan.customBuild
                      ? "Build Omega"
                      : `Subscribe to ${plan.name}`}
                  </Link>
                ) : (
                  <Link
                    href={signInHref}
                    className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                      plan.highlighted
                          ? "bg-gold-500 text-felt-950 hover:bg-gold-400"
                          : "border border-white/15 text-white hover:bg-white/5"
                    }`}
                  >
                    Sign in to Subscribe
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
