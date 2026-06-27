/**
 * @deprecated Hetzner is tabled — OVH flavor mapping lives in `@/lib/plans`.
 */
import {
  fixedPlans,
  getOmegaBuildFlavor,
  getPlanById,
  normalizePlanId,
  type PlanId,
} from "@/lib/plans";

export type PokerProbePlanId = PlanId;

export interface HetznerPlanSku {
  planId: string;
  /** OVH Public Cloud flavor name (legacy field name retained for deploy module) */
  hetznerSku: string;
  vcpu: number;
  ramGb: number;
  solverCacheGb: number;
  costUsd: number;
}

function planToSku(plan: (typeof fixedPlans)[number]): HetznerPlanSku {
  return {
    planId: plan.id,
    hetznerSku: plan.ovhFlavor,
    vcpu: plan.vcpu,
    ramGb: plan.ramGb,
    solverCacheGb: plan.solverCacheGb,
    costUsd: plan.price,
  };
}

export const hetznerPlanSkus: Record<string, HetznerPlanSku> = Object.fromEntries(
  fixedPlans.map((plan) => [plan.id, planToSku(plan)])
);

/** @deprecated Use omegaPlan from `@/lib/plans` */
export const hetznerFarmPlusSku = hetznerPlanSkus.deepstack;

export function getHetznerSkuForPlan(planId: string): HetznerPlanSku | null {
  const normalized = normalizePlanId(planId);
  if (!normalized) return null;

  const fixed = fixedPlans.find((p) => p.id === normalized);
  if (fixed) return planToSku(fixed);

  return null;
}

export function getHetznerSkuForCustomBuild(
  flavorId: string
): HetznerPlanSku | null {
  const flavor = getOmegaBuildFlavor(flavorId);
  if (!flavor) return null;
  return {
    planId: "omega",
    hetznerSku: flavor.ovhFlavor,
    vcpu: flavor.vcpu,
    ramGb: flavor.ramGb,
    solverCacheGb: flavor.solverCacheGb,
    costUsd: flavor.price,
  };
}

export { getPlanById, getOvhFlavorForPlan } from "@/lib/plans";
