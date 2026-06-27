/**
 * Server orchestration helpers for dual-zone storage (local NVMe cache + cloud vault).
 * Server-side only — uses Firestore REST via firestore-server.
 */

import {
  getServerById,
  getServerForUser,
  updateServer,
  type Server,
  type ServerStatus,
} from "@/lib/firestore-server";
import { resolveStorageLimitGb } from "@/lib/storage-vault";
import { getHetznerSkuForPlan } from "@/lib/hetzner/plan-skus";

/** Orchestration statuses that indicate an ephemeral instance is running or transitioning */
export const ORCHESTRATION_STATUSES: ReadonlySet<ServerStatus> = new Set([
  "provisioning",
  "online",
  "syncing",
  "deprovisioning",
  "stopped",
]);

export type OrchestrationStatus =
  | "stopped"
  | "provisioning"
  | "online"
  | "syncing"
  | "deprovisioning";

const VALID_TRANSITIONS: Record<OrchestrationStatus, OrchestrationStatus[]> = {
  stopped: ["provisioning"],
  provisioning: ["online", "stopped"],
  online: ["syncing", "deprovisioning"],
  syncing: ["stopped", "deprovisioning"],
  deprovisioning: ["stopped"],
};

export class ServerOrchestrationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_TRANSITION"
      | "MISSING_BILLING"
      | "UPDATE_FAILED"
  ) {
    super(message);
    this.name = "ServerOrchestrationError";
  }
}

export interface ServerOrchestrationView {
  serverId: string;
  userId: string;
  name: string;
  status: ServerStatus;
  hetznerServerId: string | null;
  hetznerType: string | null;
  ipAddress: string | null;
  uptimeStartedAt: string | null;
  stripeSubscriptionId: string;
  stripeStorageItemId: string | null;
  stripeStoragePriceId: string | null;
  linkedStorageBucket: string | null;
  storageLimitGB: number;
  solverCacheGB: number;
}

function resolveSolverCacheGb(server: Server): number {
  const sku = getHetznerSkuForPlan(server.plan);
  return sku?.solverCacheGb ?? 240;
}

function resolveHetznerType(server: Server): string | null {
  if (server.hetznerType) {
    return server.hetznerType;
  }
  const sku = getHetznerSkuForPlan(server.plan);
  return sku ? sku.hetznerSku.toLowerCase() : null;
}

export function toOrchestrationView(server: Server): ServerOrchestrationView {
  return {
    serverId: server.id,
    userId: server.userId,
    name: server.label,
    status: server.status,
    hetznerServerId: server.hetznerServerId,
    hetznerType: resolveHetznerType(server),
    ipAddress: server.ip,
    uptimeStartedAt: server.uptimeStartedAt ?? server.provisionedAt,
    stripeSubscriptionId: server.stripeSubscriptionId,
    stripeStorageItemId: server.stripeStorageItemId ?? null,
    stripeStoragePriceId: server.stripeStoragePriceId ?? null,
    linkedStorageBucket: server.linkedStorageBucket ?? null,
    storageLimitGB: resolveStorageLimitGb(server.plan, {
      storageLimitGB: server.storageLimitGB,
      stripeStoragePriceId: server.stripeStoragePriceId,
    }),
    solverCacheGB: resolveSolverCacheGb(server),
  };
}

export async function getServerOrchestrationView(
  userId: string,
  serverId: string
): Promise<ServerOrchestrationView | null> {
  const server = await getServerForUser(serverId, userId);
  return server ? toOrchestrationView(server) : null;
}

function assertOrchestrationTransition(
  current: ServerStatus,
  next: OrchestrationStatus
): void {
  if (!ORCHESTRATION_STATUSES.has(current)) {
    return;
  }
  const from = current as OrchestrationStatus;
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(next)) {
    throw new ServerOrchestrationError(
      `Invalid orchestration transition: ${from} → ${next}`,
      "INVALID_TRANSITION"
    );
  }
}

export async function updateServerOrchestrationStatus(
  serverId: string,
  status: OrchestrationStatus,
  patch: Partial<
    Pick<
      Server,
      | "hetznerServerId"
      | "hetznerType"
      | "ip"
      | "uptimeStartedAt"
      | "linkedStorageBucket"
      | "notes"
    >
  > = {}
): Promise<Server> {
  const existing = await getServerById(serverId);
  if (!existing) {
    throw new ServerOrchestrationError(
      `Server not found: ${serverId}`,
      "NOT_FOUND"
    );
  }

  assertOrchestrationTransition(existing.status, status);

  const data: Partial<Server> = { status, ...patch };

  if (status === "online" && !existing.uptimeStartedAt) {
    data.uptimeStartedAt = new Date().toISOString();
  }

  if (status === "stopped") {
    data.hetznerServerId = null;
    data.uptimeStartedAt = null;
  }

  try {
    await updateServer(serverId, data);
  } catch (err) {
    throw new ServerOrchestrationError(
      err instanceof Error ? err.message : "Firestore update failed",
      "UPDATE_FAILED"
    );
  }

  const updated = await getServerById(serverId);
  if (!updated) {
    throw new ServerOrchestrationError(
      `Failed to reload server: ${serverId}`,
      "UPDATE_FAILED"
    );
  }
  return updated;
}

export async function updateServerStorageVault(
  serverId: string,
  patch: {
    stripeStorageItemId?: string | null;
    stripeStoragePriceId?: string | null;
    storageLimitGB: number;
    linkedStorageBucket?: string | null;
  }
): Promise<Server> {
  const existing = await getServerById(serverId);
  if (!existing) {
    throw new ServerOrchestrationError(
      `Server not found: ${serverId}`,
      "NOT_FOUND"
    );
  }

  try {
    await updateServer(serverId, {
      stripeStorageItemId:
        patch.stripeStorageItemId ?? existing.stripeStorageItemId ?? null,
      stripeStoragePriceId:
        patch.stripeStoragePriceId ?? existing.stripeStoragePriceId ?? null,
      storageLimitGB: patch.storageLimitGB,
      linkedStorageBucket:
        patch.linkedStorageBucket ?? existing.linkedStorageBucket ?? null,
    });
  } catch (err) {
    throw new ServerOrchestrationError(
      err instanceof Error ? err.message : "Firestore update failed",
      "UPDATE_FAILED"
    );
  }

  const updated = await getServerById(serverId);
  if (!updated) {
    throw new ServerOrchestrationError(
      `Failed to reload server: ${serverId}`,
      "UPDATE_FAILED"
    );
  }
  return updated;
}

export function assertServerHasComputeSubscription(
  server: Pick<Server, "stripeSubscriptionId">
): void {
  if (!server.stripeSubscriptionId) {
    throw new ServerOrchestrationError(
      "Server is missing stripeSubscriptionId",
      "MISSING_BILLING"
    );
  }
}
