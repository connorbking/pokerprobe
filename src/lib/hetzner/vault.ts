/**
 * Vault entitlement updates (Firestore) after paid Stripe upgrades.
 * Storage Box subaccounts are provisioned via `@/lib/hetzner/storage`.
 */

import { getServerById, updateServer, type Server } from "@/lib/firestore-server";
import { getIncludedVaultLimitGb } from "@/lib/storage-vault";
import {
  ensureUserStorageSubaccount,
  HetznerStorageError,
} from "@/lib/hetzner/storage";

export class HetznerVaultError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "NOT_CONFIGURED" | "PROVISION_FAILED"
  ) {
    super(message);
    this.name = "HetznerVaultError";
  }
}

export interface VaultProvisionResult {
  serverId: string;
  homeDirectory: string;
  storageLimitGB: number;
}

function mapStorageError(err: unknown): HetznerVaultError {
  if (err instanceof HetznerStorageError) {
    return new HetznerVaultError(
      err.message,
      err.code === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "PROVISION_FAILED"
    );
  }
  if (err instanceof HetznerVaultError) return err;
  return new HetznerVaultError(
    err instanceof Error ? err.message : "Vault provision failed",
    "PROVISION_FAILED"
  );
}

/**
 * Ensure the user has a Storage Box subaccount and set plan-included vault limit on the server.
 */
export async function provisionServerVault(input: {
  serverId: string;
  userId: string;
  planId: string;
}): Promise<VaultProvisionResult> {
  const server = await getServerById(input.serverId);
  if (!server || server.userId !== input.userId) {
    throw new HetznerVaultError(`Server not found: ${input.serverId}`, "NOT_FOUND");
  }

  const storageLimitGB = getIncludedVaultLimitGb(input.planId);

  try {
    const storage = await ensureUserStorageSubaccount(input.userId);

    await updateServer(input.serverId, {
      linkedStorageBucket: storage.homeDirectory,
      storageLimitGB,
    });

    return {
      serverId: input.serverId,
      homeDirectory: storage.homeDirectory,
      storageLimitGB,
    };
  } catch (err) {
    throw mapStorageError(err);
  }
}

export async function updateServerVaultLimit(
  serverId: string,
  storageLimitGB: number,
  patch?: Partial<
    Pick<Server, "stripeStorageItemId" | "stripeStoragePriceId">
  >
): Promise<Server> {
  const existing = await getServerById(serverId);
  if (!existing) {
    throw new HetznerVaultError(`Server not found: ${serverId}`, "NOT_FOUND");
  }

  await updateServer(serverId, {
    storageLimitGB,
    ...patch,
  });

  const updated = await getServerById(serverId);
  if (!updated) {
    throw new HetznerVaultError(`Failed to reload server: ${serverId}`, "PROVISION_FAILED");
  }
  return updated;
}
