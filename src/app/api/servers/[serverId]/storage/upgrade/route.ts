import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getFirestoreConfigStatus } from "@/lib/firestore-env";
import { getServerForUser } from "@/lib/firestore-server";
import {
  assertServerHasComputeSubscription,
  ServerOrchestrationError,
} from "@/lib/db/servers";
import { updateServerVaultLimit } from "@/lib/hetzner/vault";
import {
  StorageUpgradeError,
  upgradeStorageSubscription,
} from "@/lib/stripe-storage";
import { getStorageVaultTierByPriceId } from "@/lib/storage-vault";

type RouteContext = { params: Promise<{ serverId: string }> };

function storageErrorResponse(err: unknown) {
  if (err instanceof StorageUpgradeError) {
    const status =
      err.code === "INVALID_PRICE" || err.code === "SAME_PRICE" ? 400 : 502;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }

  if (err instanceof ServerOrchestrationError) {
    const status =
      err.code === "NOT_FOUND"
        ? 404
        : err.code === "MISSING_BILLING"
          ? 409
          : 500;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }

  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Storage upgrade failed" },
    { status: 500 }
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user?.uid) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { serverId } = await context.params;
    const server = await getServerForUser(serverId, user.uid);
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    const body = (await request.json()) as { newStoragePriceId?: string };
    const newStoragePriceId = body.newStoragePriceId?.trim();
    if (!newStoragePriceId) {
      return NextResponse.json(
        { error: "Missing newStoragePriceId" },
        { status: 400 }
      );
    }

    const tier = getStorageVaultTierByPriceId(newStoragePriceId);
    if (!tier) {
      return NextResponse.json(
        { error: "Unknown storage price" },
        { status: 400 }
      );
    }

    assertServerHasComputeSubscription(server);

    const result = await upgradeStorageSubscription({
      stripeSubscriptionId: server.stripeSubscriptionId,
      stripeStorageItemId: server.stripeStorageItemId,
      newStoragePriceId,
    });

    await updateServerVaultLimit(serverId, result.storageLimitGB, {
      stripeStorageItemId: result.storageItemId,
      stripeStoragePriceId: result.storagePriceId,
    });

    return NextResponse.json({
      ok: true,
      storageLimitGB: result.storageLimitGB,
      stripeStoragePriceId: result.storagePriceId,
      tier: tier.name,
    });
  } catch (err) {
    console.error("POST /api/servers/[serverId]/storage/upgrade error:", err);
    const status = getFirestoreConfigStatus();
    if (err instanceof Error && err.message.includes("not configured")) {
      return NextResponse.json(
        {
          error: status.hint
            ? `Server storage is not configured. ${status.hint}`
            : `Server storage is not configured. Missing: ${status.missing.join(", ")}.`,
        },
        { status: 503 }
      );
    }
    return storageErrorResponse(err);
  }
}
