/**
 * Plan catalog for pricing UI, Stripe product names, and provisioning specs.
 * Provider/infrastructure details live in server-only modules — never shown to customers.
 */

export type PlanId = "hobby" | "grind" | "deepstack" | "omega";

/** @deprecated Legacy Firestore / Stripe IDs — normalized via normalizePlanId() */
export type LegacyPlanId =
  | "starter"
  | "pro"
  | "elite"
  | "enterprise"
  | "baremetal";

export type AnyPlanId = PlanId | LegacyPlanId;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Stripe Product display name */
  stripeProductName: string;
  ovhFlavor: string;
  price: number;
  vcpu: number;
  ramGb: number;
  solverCacheGb: number;
  storageType: "NVMe";
  publicNetworkGbps: number;
  privateNetworkGbps: number;
  includedVaultGb: number;
  concurrentJobs: number;
  description: string;
  idealFor: string;
  features: string[];
  highlighted?: boolean;
  customBuild?: boolean;
}

export interface OmegaBuildFlavor {
  id: string;
  ovhFlavor: string;
  label: string;
  vcpu: number;
  ramGb: number;
  solverCacheGb: number;
  publicNetworkGbps: number;
  privateNetworkGbps: number;
  price: number;
  includedVaultGb: number;
}

export const PLAN_IDS: PlanId[] = ["hobby", "grind", "deepstack", "omega"];

const LEGACY_TO_PLAN: Record<LegacyPlanId, PlanId> = {
  starter: "hobby",
  pro: "grind",
  elite: "deepstack",
  enterprise: "omega",
  baremetal: "omega",
};

export const fixedPlans: PlanDefinition[] = [
  {
    id: "hobby",
    name: "Hobby",
    stripeProductName: "PokerProbe Hobby",
    ovhFlavor: "b3-16",
    price: 199,
    vcpu: 4,
    ramGb: 16,
    solverCacheGb: 100,
    storageType: "NVMe",
    publicNetworkGbps: 1,
    privateNetworkGbps: 4,
    includedVaultGb: 250,
    concurrentJobs: 1,
    description: "Flopzilla, ICMIZER & light review — always-on equity work",
    idealFor: "Flopzilla · ICMIZER · hand review",
    features: [
      "4 vCPU / 16 GB RAM dedicated instance",
      "1 concurrent solver job",
      "Windows Server 2022 + RDP",
      "100 GB local NVMe solver cache",
      "250 GB permanent cloud vault included",
      "1 Gbps public · 4 Gbps private network",
      "Basic monitoring & email support",
    ],
    highlighted: false,
  },
  {
    id: "grind",
    name: "Grind",
    stripeProductName: "PokerProbe Grind",
    ovhFlavor: "b3-32",
    price: 349,
    vcpu: 8,
    ramGb: 32,
    solverCacheGb: 200,
    storageType: "NVMe",
    publicNetworkGbps: 2,
    privateNetworkGbps: 4,
    includedVaultGb: 400,
    concurrentJobs: 1,
    description: "GTO+ & overnight HRC — the sweet spot for most regs",
    idealFor: "GTO+ · HRC overnight · multi-table review",
    features: [
      "8 vCPU / 32 GB RAM dedicated instance",
      "1 concurrent solver job",
      "Windows Server 2022 + RDP",
      "200 GB local NVMe solver cache",
      "400 GB permanent cloud vault included",
      "2 Gbps public · 4 Gbps private network",
      "Auto-restart, file sync & priority support",
    ],
    highlighted: true,
  },
  {
    id: "deepstack",
    name: "Deep Stack",
    stripeProductName: "PokerProbe Deep Stack",
    ovhFlavor: "b3-64",
    price: 579,
    vcpu: 16,
    ramGb: 64,
    solverCacheGb: 400,
    storageType: "NVMe",
    publicNetworkGbps: 4,
    privateNetworkGbps: 4,
    includedVaultGb: 600,
    concurrentJobs: 2,
    description: "PioSolver postflop & large HRC trees for serious study",
    idealFor: "PioSolver · GTO+ · HRC Pro",
    features: [
      "16 vCPU / 64 GB RAM dedicated instance",
      "2 concurrent solver jobs",
      "Windows Server 2022 + RDP",
      "400 GB local NVMe solver cache",
      "600 GB permanent cloud vault included",
      "4 Gbps public · 4 Gbps private network",
      "Priority sync, monitoring & 24/7 support",
    ],
    highlighted: false,
  },
];

export const omegaPlan: PlanDefinition = {
  id: "omega",
  name: "Omega",
  stripeProductName: "PokerProbe Omega",
  ovhFlavor: "custom",
  price: 799,
  vcpu: 0,
  ramGb: 0,
  solverCacheGb: 0,
  storageType: "NVMe",
  publicNetworkGbps: 0,
  privateNetworkGbps: 4,
  includedVaultGb: 1024,
  concurrentJobs: 4,
  description: "Custom-built solver farms — pick your vCPU, RAM, and NVMe",
  idealFor: "HRC Pro · PioSolver preflop · multi-solver farms",
  features: [
    "Choose vCPU, RAM & NVMe to match your solver workload",
    "Up to full-machine concurrent solver jobs",
    "Windows Server 2022 + RDP",
    "1 TB+ permanent cloud vault included",
    "Dedicated IP option & white-glove onboarding",
    "24/7 priority support",
  ],
  customBuild: true,
};

/** Preset builds for Omega checkout — expandable beyond fixed tiers */
export const omegaBuildFlavors: OmegaBuildFlavor[] = [
  {
    id: "b3-128",
    ovhFlavor: "b3-128",
    label: "Solver Pro",
    vcpu: 32,
    ramGb: 128,
    solverCacheGb: 800,
    publicNetworkGbps: 8,
    privateNetworkGbps: 4,
    price: 899,
    includedVaultGb: 1024,
  },
  {
    id: "b3-256",
    ovhFlavor: "b3-256",
    label: "Farm Plus",
    vcpu: 64,
    ramGb: 256,
    solverCacheGb: 1600,
    publicNetworkGbps: 10,
    privateNetworkGbps: 4,
    price: 1499,
    includedVaultGb: 1536,
  },
  {
    id: "c3-256",
    ovhFlavor: "c3-256",
    label: "Compute Max",
    vcpu: 64,
    ramGb: 256,
    solverCacheGb: 1600,
    publicNetworkGbps: 10,
    privateNetworkGbps: 4,
    price: 1699,
    includedVaultGb: 2048,
  },
];

export const pricingPlans: PlanDefinition[] = [...fixedPlans, omegaPlan];

export function normalizePlanId(planId: string): PlanId | null {
  if (PLAN_IDS.includes(planId as PlanId)) {
    return planId as PlanId;
  }
  if (planId in LEGACY_TO_PLAN) {
    return LEGACY_TO_PLAN[planId as LegacyPlanId];
  }
  return null;
}

export function getPlanById(planId: string): PlanDefinition | null {
  const normalized = normalizePlanId(planId);
  if (!normalized) return null;
  return pricingPlans.find((plan) => plan.id === normalized) ?? null;
}

export function getPlanLabel(planId: string): string {
  return getPlanById(planId)?.name ?? planId;
}

export function formatPlanSpecSummary(input: {
  vcpu: number;
  ramGb: number;
}): string {
  return `${input.vcpu} vCPU / ${input.ramGb} GB RAM`;
}

export function getPlanSpecSummary(planId: string): string | null {
  const plan = getPlanById(planId);
  if (!plan || plan.customBuild || !plan.vcpu) return null;
  return formatPlanSpecSummary(plan);
}

export function getPlanLabelWithTier(planId: string): string {
  const plan = getPlanById(planId);
  if (!plan) return planId;
  if (plan.customBuild) return `${plan.name} (Custom)`;
  const spec = getPlanSpecSummary(planId);
  return spec ? `${plan.name} (${spec})` : plan.name;
}

export function getOvhFlavorForPlan(planId: string): string | null {
  return getPlanById(planId)?.ovhFlavor ?? null;
}

export function getOmegaBuildFlavor(flavorId: string): OmegaBuildFlavor | null {
  return omegaBuildFlavors.find((f) => f.id === flavorId) ?? null;
}

export function isKnownPlanId(planId: string): planId is AnyPlanId {
  return normalizePlanId(planId) !== null || planId in LEGACY_TO_PLAN;
}

export function isCheckoutPlanId(planId: string): planId is PlanId {
  return PLAN_IDS.includes(planId as PlanId);
}

export function getStripeProductName(planId: string): string {
  const plan = getPlanById(planId);
  if (!plan) return "PokerProbe Subscription";
  if (plan.id === "omega") return plan.stripeProductName;
  return plan.stripeProductName;
}

export const enterprisePlan = {
  id: "omega" as const,
  name: "Omega",
  subtitle: "Custom dedicated build",
  referenceSpec: "32–64 vCPU / 128–256 GB · up to 1.6 TB NVMe",
  startingPrice: omegaBuildFlavors[0]?.price ?? 799,
  contactEmail: "support@pokerprobe.com",
  contactSubject: "Custom Omega build or off-catalog hardware inquiry",
};

export const planComparisonRows = [
  {
    label: "Monthly price",
    hobby: "$199",
    grind: "$349",
    deepstack: "$579",
    omega: "From $899",
  },
  {
    label: "vCPU / RAM",
    hobby: "4 vCPU / 16 GB",
    grind: "8 vCPU / 32 GB",
    deepstack: "16 vCPU / 64 GB",
    omega: "Your choice",
  },
  {
    label: "Best for",
    hobby: "Flopzilla, ICMIZER",
    grind: "GTO+, HRC overnight",
    deepstack: "PioSolver postflop, HRC Pro",
    omega: "Solver farms & max tree builds",
  },
  {
    label: "Concurrent solver jobs",
    hobby: "1",
    grind: "1",
    deepstack: "2",
    omega: "Full machine",
  },
  {
    label: "Local NVMe (solver cache)",
    hobby: "100 GB",
    grind: "200 GB",
    deepstack: "400 GB",
    omega: "Up to 1.6 TB",
  },
  {
    label: "Permanent cloud vault",
    hobby: "250 GB incl.",
    grind: "400 GB incl.",
    deepstack: "600 GB incl.",
    omega: "1 TB+ incl.",
  },
  {
    label: "Public network",
    hobby: "1 Gbps",
    grind: "2 Gbps",
    deepstack: "4 Gbps",
    omega: "8–10 Gbps",
  },
  {
    label: "PioSolver postflop (8–16 GB trees)",
    hobby: false,
    grind: true,
    deepstack: true,
    omega: true,
  },
  {
    label: "PioSolver preflop (64 GB+ RAM)",
    hobby: false,
    grind: false,
    deepstack: true,
    omega: true,
  },
  {
    label: "Operating system",
    hobby: "Windows Server 2022",
    grind: "Windows Server 2022",
    deepstack: "Windows Server 2022",
    omega: "Windows Server 2022",
  },
  { label: "RDP access", hobby: true, grind: true, deepstack: true, omega: true },
  {
    label: "Support",
    hobby: "Email",
    grind: "Priority email",
    deepstack: "24/7 priority",
    omega: "Dedicated account manager",
  },
];
