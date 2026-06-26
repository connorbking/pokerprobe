import type { PlanId } from "@/lib/firestore-server";

export interface SimProgram {
  id: string;
  name: string;
  tag: string;
}

/** Poker simulators available per plan — drives provisioning tags and manage UI */
export const simCatalog: SimProgram[] = [
  { id: "flopzilla", name: "Flopzilla", tag: "sim:flopzilla" },
  { id: "icmizer", name: "ICMIZER", tag: "sim:icmizer" },
  { id: "gto-plus", name: "GTO+", tag: "sim:gto-plus" },
  { id: "hrc", name: "HRC", tag: "sim:hrc" },
  { id: "piosolver", name: "PioSolver", tag: "sim:piosolver" },
];

const planSimIds: Record<PlanId, string[]> = {
  starter: ["flopzilla", "icmizer", "gto-plus"],
  pro: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
  elite: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
  baremetal: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
};

export function getSimsForPlan(planId: PlanId): SimProgram[] {
  const ids = planSimIds[planId] ?? planSimIds.starter;
  return simCatalog.filter((sim) => ids.includes(sim.id));
}

/** Tags passed to provisioning (Hetzner labels / cloud-init) to install the right sim stack */
export function getProvisionTagsForPlan(planId: PlanId): string[] {
  const base = ["pokerprobe", `plan:${planId}`];
  const simTags = getSimsForPlan(planId).map((sim) => sim.tag);
  return [...base, ...simTags];
}

export function simNameFromTag(tag: string): string {
  return simCatalog.find((sim) => sim.tag === tag)?.name ?? tag;
}
