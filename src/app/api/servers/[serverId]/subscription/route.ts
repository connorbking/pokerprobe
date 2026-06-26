import { NextResponse } from "next/server";
import { isFirestoreAdmin } from "@/lib/admin-auth";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getFirestoreConfigStatus } from "@/lib/firestore-env";
import {
  getServerById,
  getServerForUser,
  updateServer,
} from "@/lib/firestore-server";
import { terminateServerRecord } from "@/lib/server-provision";
import {
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  getSubscriptionBillingView,
} from "@/lib/stripe-billing";

type RouteContext = { params: Promise<{ serverId: string }> };

function billingErrorResponse(err: unknown) {
  console.error("Subscription billing error:", err);
  const message =
    err instanceof Error ? err.message : "Subscription request failed";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
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

    if (!server.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No subscription linked to this server" },
        { status: 404 }
      );
    }

    const billing = await getSubscriptionBillingView(server.stripeSubscriptionId);

    await updateServer(serverId, {
      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
      currentPeriodEnd: billing.currentPeriodEnd,
    });

    return NextResponse.json({ billing, serverStatus: server.status });
  } catch (err) {
    const status = getFirestoreConfigStatus();
    if (err instanceof Error && err.message.includes("not configured")) {
      return NextResponse.json(
        {
          error: status.hint
            ? `Server storage is not configured. ${status.hint}`
            : "Server storage is not configured.",
        },
        { status: 503 }
      );
    }
    return billingErrorResponse(err);
  }
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

    if (server.status === "terminated") {
      return NextResponse.json(
        { error: "This server is already canceled" },
        { status: 400 }
      );
    }

    if (!server.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No subscription linked to this server" },
        { status: 400 }
      );
    }

    const billing = await cancelSubscriptionAtPeriodEnd(
      server.stripeSubscriptionId
    );

    await updateServer(serverId, {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: billing.currentPeriodEnd,
    });

    return NextResponse.json({
      billing,
      message:
        "Subscription canceled. You keep access until the end of your current billing period.",
    });
  } catch (err) {
    return billingErrorResponse(err);
  }
}

/** Admin-only immediate cancel — also exposed via cancel-immediate route */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user?.uid) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    if (!(await isFirestoreAdmin(user.uid))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { serverId } = await context.params;
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (server.status === "terminated") {
      return NextResponse.json({ ok: true, alreadyTerminated: true });
    }

    if (server.stripeSubscriptionId) {
      try {
        await cancelSubscriptionImmediately(server.stripeSubscriptionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.toLowerCase().includes("canceled")) {
          throw err;
        }
      }
    }

    await terminateServerRecord(server);

    return NextResponse.json({
      ok: true,
      message: "Subscription canceled immediately and server removed.",
    });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
