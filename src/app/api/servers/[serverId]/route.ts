import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getFirestoreConfigStatus } from "@/lib/firestore-env";
import {
  getServerForUser,
  updateServer,
} from "@/lib/firestore-server";
import { normalizeServerLabel, validateServerLabel } from "@/lib/server-label";

type RouteContext = { params: Promise<{ serverId: string }> };

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

    return NextResponse.json({ server });
  } catch (err) {
    console.error("GET /api/servers/[serverId] error:", err);
    const status = getFirestoreConfigStatus();
    let message = "Failed to load server";
    if (err instanceof Error && err.message.includes("not configured")) {
      message = status.hint
        ? `Server storage is not configured. ${status.hint}`
        : `Server storage is not configured. Missing: ${status.missing.join(", ")}.`;
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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

    const body = (await request.json()) as { label?: string };
    if (body.label === undefined) {
      return NextResponse.json(
        { error: "No supported fields to update." },
        { status: 400 }
      );
    }

    const labelError = validateServerLabel(body.label);
    if (labelError) {
      return NextResponse.json({ error: labelError }, { status: 400 });
    }

    const label = normalizeServerLabel(body.label);
    await updateServer(serverId, { label });

    return NextResponse.json({ server: { ...server, label } });
  } catch (err) {
    console.error("PATCH /api/servers/[serverId] error:", err);
    return NextResponse.json(
      { error: "Failed to update server" },
      { status: 500 }
    );
  }
}
