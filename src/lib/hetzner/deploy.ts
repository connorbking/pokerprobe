/**
 * End-to-end deploy/teardown orchestration using Hetzner Storage Box + Cloud compute.
 * Server-side only.
 */

import {
  getServerById,
  getUserByUid,
  updateServer,
  type Server,
} from "@/lib/firestore-server";
import {
  ServerOrchestrationError,
  updateServerOrchestrationStatus,
} from "@/lib/db/servers";
import { getHetznerSkuForPlan } from "@/lib/hetzner/plan-skus";
import { getIncludedVaultLimitGb } from "@/lib/storage-vault";
import {
  buildStorageBoxRcloneCloudInit,
  SYNC_PATHS,
  VAULT_SOLVER_CACHE_DIR,
} from "@/lib/hetzner/cloud-init";
import {
  createHetznerServer,
  deleteAllHetznerServersForUser,
  deleteHetznerServer,
  HetznerComputeError,
} from "@/lib/hetzner/compute";
import {
  ensureUserStorageSubaccount,
  getUserStorageSubaccount,
  HetznerStorageError,
} from "@/lib/hetzner/storage";

export class DeployUserServerError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "NOT_CONFIGURED"
      | "INVALID_STATE"
      | "API_ERROR"
      | "SYNC_FAILED"
  ) {
    super(message);
    this.name = "DeployUserServerError";
  }
}

function mapError(err: unknown): DeployUserServerError {
  if (err instanceof DeployUserServerError) return err;
  if (err instanceof HetznerComputeError) {
    return new DeployUserServerError(err.message, err.code === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "API_ERROR");
  }
  if (err instanceof HetznerStorageError) {
    return new DeployUserServerError(err.message, err.code === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "API_ERROR");
  }
  if (err instanceof ServerOrchestrationError) {
    return new DeployUserServerError(err.message, "API_ERROR");
  }
  return new DeployUserServerError(
    err instanceof Error ? err.message : "Deploy failed",
    "API_ERROR"
  );
}

interface SyncCompletionMarker {
  completed: boolean;
  error?: string;
}

async function pollSyncCompletion(
  server: Server,
  timeoutMs = 15 * 60 * 1000
): Promise<SyncCompletionMarker> {
  const pollIntervalMs = 5000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const markerUrl = server.ip
      ? `http://${server.ip}:9191/pokerprobe/sync-status`
      : null;

    if (markerUrl) {
      try {
        const res = await fetch(markerUrl, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = (await res.json()) as SyncCompletionMarker;
          if (data.completed) return data;
          if (data.error) {
            throw new DeployUserServerError(data.error, "SYNC_FAILED");
          }
        }
      } catch (err) {
        if (err instanceof DeployUserServerError) throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new DeployUserServerError(
    "Timed out waiting for vault sync to complete",
    "SYNC_FAILED"
  );
}

async function triggerRemoteVaultSync(server: Server, vaultHome: string): Promise<void> {
  if (!server.ip) {
    throw new DeployUserServerError(
      "Cannot trigger sync without server IP",
      "INVALID_STATE"
    );
  }

  const remoteRoot = vaultHome.replace(/\/$/, "");
  const syncScript = [
    "rclone sync",
    SYNC_PATHS.solverCache,
    `pokerprobe-vault:${remoteRoot}/${VAULT_SOLVER_CACHE_DIR}/`,
    `--config ${SYNC_PATHS.rcloneConfig}`,
    "--fast-list",
    "--transfers 8",
    "--checksum",
  ].join(" ");

  const res = await fetch(`http://${server.ip}:9191/pokerprobe/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      command: syncScript,
      token: process.env.POKERPROBE_NODE_AGENT_TOKEN ?? "",
    }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);

  if (!res?.ok) {
    console.warn(
      `[DEPLOY] Remote sync trigger unavailable for ${server.id}; agent must run sync on shutdown`
    );
  }
}

/**
 * Provision Storage Box subaccount (if needed), build rclone cloud-init, and launch CCX server.
 */
export async function deployUserServer(
  userId: string,
  serverId: string
): Promise<Server> {
  const server = await getServerById(serverId);
  if (!server || server.userId !== userId) {
    throw new DeployUserServerError(`Server not found: ${serverId}`, "NOT_FOUND");
  }

  if (
    server.status !== "stopped" &&
    server.status !== "pending" &&
    server.status !== "active"
  ) {
    throw new DeployUserServerError(
      `Cannot deploy server in status: ${server.status}`,
      "INVALID_STATE"
    );
  }

  const user = await getUserByUid(userId);
  if (!user) {
    throw new DeployUserServerError(`User not found: ${userId}`, "NOT_FOUND");
  }

  try {
    await ensureUserStorageSubaccount(userId);
    const reloaded = await getUserByUid(userId);
    const storage = getUserStorageSubaccount(reloaded ?? user);

    const sku = getHetznerSkuForPlan(server.plan);
    const serverType = sku?.hetznerSku.toLowerCase() ?? "ccx33";
    const storageLimitGB =
      server.storageLimitGB ?? getIncludedVaultLimitGb(server.plan);

    await updateServerOrchestrationStatus(serverId, "provisioning", {
      hetznerType: serverType,
      linkedStorageBucket: storage.homeDirectory,
    });

    await updateServer(serverId, { storageLimitGB });

    const userData = buildStorageBoxRcloneCloudInit({
      userId,
      serverId,
      storage,
    });

    const simLabels = (server.provisionTags ?? []).reduce<Record<string, string>>(
      (acc, tag) => {
        acc[`sim_${tag.replace(/[^a-z0-9_]/gi, "_")}`] = "1";
        return acc;
      },
      {}
    );

    const created = await createHetznerServer({
      name: `pp-${server.serverSlug ?? serverId}`,
      serverType,
      userId,
      serverId,
      userData,
      extraLabels: simLabels,
    });

    return updateServerOrchestrationStatus(serverId, "online", {
      hetznerServerId: String(created.id),
      ip: created.public_net.ipv4?.ip ?? null,
      hetznerType: serverType,
      linkedStorageBucket: storage.homeDirectory,
    });
  } catch (err) {
    try {
      await updateServerOrchestrationStatus(serverId, "stopped");
    } catch {
      // best effort rollback
    }
    throw mapError(err);
  }
}

/** Sync vault, delete VM, optionally sweep all nodes for user. */
export async function teardownUserServer(
  userId: string,
  serverId: string,
  options?: { deleteAllUserServers?: boolean }
): Promise<void> {
  const server = await getServerById(serverId);
  if (!server || server.userId !== userId) {
    throw new DeployUserServerError(`Server not found: ${serverId}`, "NOT_FOUND");
  }

  if (!server.hetznerServerId) {
    await updateServerOrchestrationStatus(serverId, "stopped");
    return;
  }

  if (server.status !== "online" && server.status !== "active") {
    throw new DeployUserServerError(
      `Cannot teardown server in status: ${server.status}`,
      "INVALID_STATE"
    );
  }

  const user = await getUserByUid(userId);
  const vaultHome =
    user?.hetznerStorage?.homeDirectory ??
    server.linkedStorageBucket ??
    "/";

  await updateServerOrchestrationStatus(serverId, "syncing");

  try {
    await triggerRemoteVaultSync(server, vaultHome);
    await pollSyncCompletion(server);
  } catch (err) {
    console.error(`[DEPLOY] Sync failed for ${serverId}:`, err);
    throw mapError(err);
  }

  await updateServerOrchestrationStatus(serverId, "deprovisioning");

  try {
    await deleteHetznerServer(server.hetznerServerId);
  } catch (err) {
    throw mapError(err);
  }

  if (options?.deleteAllUserServers) {
    await deleteAllHetznerServersForUser(userId);
  }

  await updateServerOrchestrationStatus(serverId, "stopped", {
    hetznerServerId: null,
    ip: null,
  });
}

/** Cron / cancellation helper — delete all VMs labeled pokerprobe_user_id={userId}. */
export async function sweepUserComputeResources(userId: string): Promise<number> {
  return deleteAllHetznerServersForUser(userId);
}

/** Backward-compatible alias */
export const launchServer = deployUserServer;
export const teardownServer = teardownUserServer;
