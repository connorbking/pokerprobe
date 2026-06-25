import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
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
    const message =
      err instanceof Error && err.message.includes("not configured")
        ? "Server storage is not configured"
        : "Failed to load servers";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
