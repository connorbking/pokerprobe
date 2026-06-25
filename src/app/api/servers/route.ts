import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getFirestoreConfigStatus } from "@/lib/firestore-env";
import { getServersByUserId } from "@/lib/firestore-server";

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user?.uid) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const servers = await getServersByUserId(user.uid);
    return NextResponse.json({ servers });
  } catch (err) {
    console.error("GET /api/servers error:", err);
    const status = getFirestoreConfigStatus();
    let message = "Failed to load servers";
    if (err instanceof Error && err.message.includes("not configured")) {
      message = status.hint
        ? `Server storage is not configured. ${status.hint}`
        : `Server storage is not configured. Missing: ${status.missing.join(", ")}.`;
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
