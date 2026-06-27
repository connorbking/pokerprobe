"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  enterprisePlan,
  getPlanSpecSummary,
  planComparisonRows,
  pricingPlans,
} from "@/lib/plans";
import { siteConfig } from "@/lib/config";

const planColumnKeys = pricingPlans.map((plan) => plan.id);

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="text-gold-400" aria-label="Included">
        ✓
      </span>
    ) : (
      <span className="text-gray-600" aria-label="Not included">
        —
      </span>
    );
  }
  return <span className="text-gray-300">{value}</span>;
}

function PlanComparisonTable({
  onSubscribe,
}: {
  onSubscribe: (planId: string) => void;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-white">Compare plans</h2>
      <p className="mt-1 text-sm text-gray-500">
        Full feature breakdown across every tier.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-felt-800/60">
              <th className="px-4 py-3 font-medium text-gray-400">Feature</th>
              {pricingPlans.map((plan) => (
                <th
                  key={plan.id}
                  className={`px-4 py-3 font-semibold ${
                    plan.highlighted ? "text-gold-400" : "text-white"
                  }`}
                >
                  {plan.name}
                  <span className="mt-0.5 block text-xs font-normal text-gray-400">
                    {plan.customBuild ? "Custom build" : getPlanSpecSummary(plan.id)}
                  </span>
                  {plan.highlighted && (
                    <span className="mt-1 block text-xs font-normal text-gold-400/70">
                      Popular
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planComparisonRows.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? "bg-felt-900/20" : "bg-transparent"}
              >
                <td className="border-t border-white/5 px-4 py-3 font-medium text-gray-400">
                  {row.label}
                </td>
                {planColumnKeys.map((key) => (
                  <td key={key} className="border-t border-white/5 px-4 py-3">
                    <ComparisonCell
                      value={
                        row[key as keyof typeof row] as string | boolean
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-white/10 bg-felt-800/40">
              <td className="px-4 py-4" />
              {pricingPlans.map((plan) => (
                <td key={plan.id} className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onSubscribe(plan.id)}
                    className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                      plan.highlighted
                        ? "bg-gold-500 text-felt-950 hover:bg-gold-400"
                        : "border border-white/15 text-white hover:bg-white/5"
                    }`}
                  >
                    {plan.customBuild ? "Build Omega" : `Get ${plan.name}`}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChoosePlanSection({
  subtitle = "Pick the tier that matches your solver workload. Upgrade anytime.",
}: {
  subtitle?: string;
}) {
  const router = useRouter();

  const handleSubscribe = (planId: string) => {
    if (planId === "omega") {
      router.push("/dashboard/checkout/omega");
      return;
    }
    router.push(`/dashboard/checkout/${planId}`);
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">
        Choose a plan
      </h1>
      <p className="mt-2 text-gray-400">{subtitle}</p>
      <p className="mt-3 max-w-3xl text-sm text-gray-500">
        {siteConfig.dualZoneStorageNote}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`card-glow flex flex-col rounded-xl border p-6 ${
              plan.highlighted
                ? "border-gold-400/40 bg-felt-800/60"
                : "border-white/5 bg-felt-800/30"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs font-medium text-gray-500">
                  {plan.customBuild ? "Custom dedicated build" : getPlanSpecSummary(plan.id)}
                </p>
              </div>
              {plan.highlighted && (
                <span className="shrink-0 rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-semibold text-felt-950">
                  Popular
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
            <p className="mt-2 text-xs font-medium text-gold-400/80">
              {plan.idealFor}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              {plan.customBuild ? (
                <>
                  <span className="text-lg text-gray-400">From</span>
                  <span className="text-3xl font-bold text-gold-400">
                    ${enterprisePlan.startingPrice}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-gold-400">
                  ${plan.price}
                </span>
              )}
              <span className="text-gray-500">/mo</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-xs text-gray-400">
                  <span className="text-gold-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleSubscribe(plan.id)}
              className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition ${
                plan.highlighted
                  ? "bg-gold-500 text-felt-950 hover:bg-gold-400"
                  : "border border-white/15 text-white hover:bg-white/5"
              }`}
            >
              {plan.customBuild ? "Build your Omega" : `Get ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <PlanComparisonTable onSubscribe={handleSubscribe} />

      <p className="mt-10 text-center text-sm text-gray-500">
        <Link href="/dashboard" className="text-gold-400 hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
