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

export function getServerDisplayStatus(
  server: Pick<Server, "status">
): { label: string; color: "gray" | "yellow" | "green" | "red" | "blue" } {
  switch (server.status) {
    case "active":
      return { label: "Online", color: "green" };
    case "pending":
      return { label: "Pending setup", color: "yellow" };
    case "provisioning":
      return { label: "Provisioning", color: "blue" };
    case "suspended":
      return { label: "Suspended", color: "red" };
    case "terminated":
      return { label: "Terminated", color: "gray" };
  }
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
