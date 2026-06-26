import type { Server, ServerStatus } from "@/lib/firestore-server";

const PLAN_LABELS: Record<string, string> = {
  starter: "Study",
  pro: "Solver",
  elite: "Farm",
  baremetal: "Bare Metal",
};

export function getPlanLabel(plan: string): string {
  return PLAN_LABELS[plan] ?? plan;
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
  }
}

/** Status indicator: green when online, red when off or unreachable */
export function getServerStatusLightColor(
  server: Pick<Server, "status">,
  options: { effectiveOnline?: boolean } = {}
): ServerStatusLightColor {
  if (options.effectiveOnline ?? server.status === "active") {
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
  if (options.effectiveOnline ?? server.status === "active") {
    return "Online";
  }
  return getServerDisplayStatus(server).label;
}

export function isServerOnline(server: Pick<Server, "status">): boolean {
  return server.status === "active";
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
