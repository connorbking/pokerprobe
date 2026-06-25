/**
 * Hetzner CCX dedicated vCPU mapping for PokerProbe tiers.
 * Server-side only — do not import from client components.
 */

export type PokerProbePlanId = "starter" | "pro" | "elite";

export interface HetznerPlanSku {
  planId: PokerProbePlanId;
  hetznerSku: string;
  vcpu: number;
  ramGb: number;
  storageGb: number;
  /** Your all-in monthly infrastructure cost (USD) */
  costUsd: number;
}

export const hetznerPlanSkus: Record<PokerProbePlanId, HetznerPlanSku> = {
  starter: {
    planId: "starter",
    hetznerSku: "CCX33",
    vcpu: 8,
    ramGb: 32,
    storageGb: 240,
    costUsd: 165.99,
  },
  pro: {
    planId: "pro",
    hetznerSku: "CCX43",
    vcpu: 16,
    ramGb: 64,
    storageGb: 360,
    costUsd: 329.49,
  },
  elite: {
    planId: "elite",
    hetznerSku: "CCX53",
    vcpu: 32,
    ramGb: 128,
    storageGb: 600,
    costUsd: 635.49,
  },
};

/** Optional upsell tier — not a public plan; for Farm+ or Enterprise cloud path */
export const hetznerFarmPlusSku = {
  hetznerSku: "CCX63",
  vcpu: 48,
  ramGb: 192,
  storageGb: 960,
  costUsd: 1014.49,
} as const;

export function getHetznerSkuForPlan(planId: string): HetznerPlanSku | null {
  return hetznerPlanSkus[planId as PokerProbePlanId] ?? null;
}
