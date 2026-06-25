import customerServers from "@/data/customer-servers.json";

export type ServerStatus = "pending" | "active" | "suspended";

export interface CustomerServer {
  id: string;
  label?: string;
  status: ServerStatus;
  host?: string;
  username?: string;
  plan?: string;
  provisionedAt?: string;
  notes?: string;
}

type RegistryEntry = CustomerServer | CustomerServer[];
type ServerRegistry = Record<string, RegistryEntry>;

const registry = customerServers as ServerRegistry;

function normalizeEntry(entry: RegistryEntry): CustomerServer[] {
  const list = Array.isArray(entry) ? entry : [entry];
  return list.map((server, index) => ({
    ...server,
    id: server.id ?? `server-${index + 1}`,
  }));
}

export function getCustomerServers(
  email: string | null | undefined
): CustomerServer[] {
  if (!email) return [];
  const entry = registry[email.toLowerCase()];
  if (!entry) return [];
  return normalizeEntry(entry);
}

/** @deprecated Use getCustomerServers */
export function getCustomerServer(
  email: string | null | undefined
): CustomerServer | null {
  return getCustomerServers(email)[0] ?? null;
}

export function getServerDisplayStatus(
  server: CustomerServer
): { label: string; color: "gray" | "yellow" | "green" | "red" } {
  switch (server.status) {
    case "active":
      return { label: "Online", color: "green" };
    case "pending":
      return { label: "Pending setup", color: "yellow" };
    case "suspended":
      return { label: "Suspended", color: "red" };
  }
}
