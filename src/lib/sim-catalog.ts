import type { PlanId } from "@/lib/firestore-server";
import { normalizePlanId } from "@/lib/plans";

export interface SimProgram {
  id: string;
  name: string;
  tag: string;
}

export const simCatalog: SimProgram[] = [
  { id: "flopzilla", name: "Flopzilla", tag: "sim:flopzilla" },
  { id: "icmizer", name: "ICMIZER", tag: "sim:icmizer" },
  { id: "gto-plus", name: "GTO+", tag: "sim:gto-plus" },
  { id: "hrc", name: "HRC", tag: "sim:hrc" },
  { id: "piosolver", name: "PioSolver", tag: "sim:piosolver" },
];

const planSimIds: Record<string, string[]> = {
  hobby: ["flopzilla", "icmizer"],
  grind: ["flopzilla", "icmizer", "gto-plus"],
  deepstack: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
  omega: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
  starter: ["flopzilla", "icmizer"],
  pro: ["flopzilla", "icmizer", "gto-plus"],
  elite: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
  enterprise: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
  baremetal: ["flopzilla", "icmizer", "gto-plus", "hrc", "piosolver"],
};

export function getSimsForPlan(planId: PlanId | string): SimProgram[] {
  const normalized = normalizePlanId(planId) ?? planId;
  const ids = planSimIds[normalized] ?? planSimIds.hobby;
  return simCatalog.filter((sim) => ids.includes(sim.id));
}

export function getProvisionTagsForPlan(planId: PlanId | string): string[] {
  const normalized = normalizePlanId(planId) ?? planId;
  const base = ["pokerprobe", `plan:${normalized}`];
  const simTags = getSimsForPlan(normalized).map((sim) => sim.tag);
  return [...base, ...simTags];
}

export function simNameFromTag(tag: string): string {
  return simCatalog.find((sim) => sim.tag === tag)?.name ?? tag;
}
