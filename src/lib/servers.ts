import type { PlanId, Server, ServerStatus } from "@/lib/firestore-server";
import {
  getPlanById,
  getPlanLabel as planLabel,
  getPlanLabelWithTier as planLabelWithTier,
  isKnownPlanId as plansIsKnown,
  normalizePlanId,
} from "@/lib/plans";

export function getPlanLabel(plan: string): string {
  return planLabel(plan);
}

export function getPlanLabelWithTier(plan: string): string {
  const normalized = normalizePlanId(plan);
  if (normalized === "omega") {
    return planLabelWithTier(plan);
  }
  return planLabelWithTier(plan);
}

export function getPlanOvhFlavor(plan: string): string | null {
  return getPlanById(plan)?.ovhFlavor ?? null;
}

/** @deprecated Use getPlanOvhFlavor */
export function getPlanHetznerSku(plan: string): string | null {
  return getPlanOvhFlavor(plan);
}

export function isKnownPlanId(planId: string): planId is PlanId {
  return plansIsKnown(planId);
}

export type ServerStatusLightColor = "green" | "red";

export function getServerDisplayStatus(
  server: Pick<Server, "status">
): { label: string; color: ServerStatusLightColor } {
  switch (server.status) {
    case "active":
      return { label: "Online", color: "green" };
    case "pending":
      return { label: "Pending setup", color: "red" };
    case "provisioning":
      return { label: "Setting up", color: "red" };
    case "suspended":
      return { label: "Cannot access", color: "red" };
    case "terminated":
      return { label: "Offline", color: "red" };
    case "stopped":
      return { label: "Stopped", color: "red" };
    case "online":
      return { label: "Online", color: "green" };
    case "syncing":
      return { label: "Syncing vault", color: "red" };
    case "deprovisioning":
      return { label: "Shutting down", color: "red" };
  }
}

export function getServerStatusLightColor(
  server: Pick<Server, "status">,
  options: { effectiveOnline?: boolean } = {}
): ServerStatusLightColor {
  if (options.effectiveOnline ?? isServerOnline(server)) {
    return "green";
  }
  return "red";
}

export function getServerStatusLabel(
  server: Pick<Server, "status">,
  options: { previewMode?: boolean; effectiveOnline?: boolean } = {}
): string {
  if (options.previewMode) {
    return "Online (mocked)";
  }
  if (options.effectiveOnline ?? isServerOnline(server)) {
    return "Online";
  }
  return getServerDisplayStatus(server).label;
}

export function isServerOnline(server: Pick<Server, "status">): boolean {
  return server.status === "active" || server.status === "online";
}

export function canAccessServerManage(
  server: Pick<Server, "status">,
  options: { allowBeforeOnline?: boolean } = {}
): boolean {
  if (isServerOnline(server)) {
    return true;
  }
  return options.allowBeforeOnline === true;
}

export function isVisibleServerStatus(status: ServerStatus): boolean {
  return status !== "terminated";
}

export function getServerSpecLabel(
  server: Pick<Server, "plan" | "customBuild">
): string {
  if (server.customBuild) {
    const { vcpu, ramGb, solverCacheGb } = server.customBuild;
    return `${vcpu} vCPU / ${ramGb} GB RAM · ${solverCacheGb} GB NVMe`;
  }
  const plan = getPlanById(server.plan);
  if (plan && !plan.customBuild) {
    return `${plan.vcpu} vCPU / ${plan.ramGb} GB RAM · ${plan.solverCacheGb} GB NVMe`;
  }
  return getPlanLabel(server.plan);
}
