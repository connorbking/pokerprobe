/**
 * Permanent cloud vault tier catalog.
 * Safe to import from client components — no Stripe secrets.
 */

import { fixedPlans, getPlanById, normalizePlanId } from "@/lib/plans";

export type StorageVaultTierId = "pro1tb" | "master4tb";

export interface StorageVaultTier {
  id: StorageVaultTierId;
  name: string;
  tagline: string;
  limitGB: number;
  priceMonthlyUsd: number;
  stripePriceId: string;
  highlighted?: boolean;
}

function buildIncludedVaultMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const plan of fixedPlans) {
    map[plan.id] = plan.includedVaultGb;
  }
  map.omega = getPlanById("omega")?.includedVaultGb ?? 1024;
  map.starter = map.hobby!;
  map.pro = map.grind!;
  map.elite = map.deepstack!;
  map.enterprise = map.omega!;
  map.baremetal = map.omega!;
  return map;
}

export const INCLUDED_VAULT_GB_BY_PLAN = buildIncludedVaultMap();

export function getIncludedVaultLimitGb(planId: string): number {
  const normalized = normalizePlanId(planId);
  if (normalized) {
    return INCLUDED_VAULT_GB_BY_PLAN[normalized] ?? INCLUDED_VAULT_GB_BY_PLAN.hobby!;
  }
  return INCLUDED_VAULT_GB_BY_PLAN[planId] ?? INCLUDED_VAULT_GB_BY_PLAN.hobby!;
}

export const DEFAULT_VAULT_LIMIT_GB = INCLUDED_VAULT_GB_BY_PLAN.hobby!;

export const STORAGE_VAULT_TIERS: StorageVaultTier[] = [
  {
    id: "pro1tb",
    name: "1 TB Pro Vault",
    tagline: "Archive solver trees & hand histories",
    limitGB: 1024,
    priceMonthlyUsd: 19,
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_STORAGE_PRICE_1TB ??
      process.env.STRIPE_STORAGE_PRICE_1TB ??
      "price_storage_1tb",
    highlighted: true,
  },
  {
    id: "master4tb",
    name: "4 TB Stable Master",
    tagline: "Multi-solver farms & long-term libraries",
    limitGB: 4096,
    priceMonthlyUsd: 119,
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_STORAGE_PRICE_4TB ??
      process.env.STRIPE_STORAGE_PRICE_4TB ??
      "price_storage_4tb",
  },
];

export function formatVaultLimitGb(gb: number): string {
  if (gb >= 1024 && gb % 1024 === 0) {
    return `${gb / 1024} TB`;
  }
  return `${gb} GB`;
}

export function getStorageVaultTierByPriceId(
  priceId: string
): StorageVaultTier | undefined {
  return STORAGE_VAULT_TIERS.find((tier) => tier.stripePriceId === priceId);
}

export function getStorageVaultTierById(
  tierId: StorageVaultTierId
): StorageVaultTier | undefined {
  return STORAGE_VAULT_TIERS.find((tier) => tier.id === tierId);
}

export function resolveStorageLimitGb(
  planId: string,
  options?: {
    storageLimitGB?: number | null;
    stripeStoragePriceId?: string | null;
  }
): number {
  if (options?.storageLimitGB != null && options.storageLimitGB > 0) {
    return options.storageLimitGB;
  }

  const paidTier = options?.stripeStoragePriceId
    ? getStorageVaultTierByPriceId(options.stripeStoragePriceId)
    : undefined;
  if (paidTier) {
    return paidTier.limitGB;
  }

  return getIncludedVaultLimitGb(planId);
}

export function getUpgradeableVaultTiers(currentLimitGb: number): StorageVaultTier[] {
  return STORAGE_VAULT_TIERS.filter((tier) => tier.limitGB > currentLimitGb);
}

export function getIncludedVaultLabel(planId: string): string {
  return `${formatVaultLimitGb(getIncludedVaultLimitGb(planId))} included vault`;
}
