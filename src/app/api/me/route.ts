import { NextResponse } from "next/server";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { getFirestoreConfigStatus } from "@/lib/firestore-env";
import { getUserByUid } from "@/lib/firestore-server";

export async function GET(request: Request) {
  try {
    const authUser = await getServerUserFromRequest(request);
    if (!authUser?.uid) {
      return NextResponse.json({ user: null, isAdmin: false });
    }

    const record = await getUserByUid(authUser.uid);
    const isAdmin = record?.isAdmin === true;

    return NextResponse.json({
      user: {
        uid: authUser.uid,
        email: authUser.email,
        isAdmin,
      },
      isAdmin,
    });
  } catch (err) {
    console.error("GET /api/me error:", err);
    const status = getFirestoreConfigStatus();
    let message = "Failed to load profile";
    if (err instanceof Error && err.message.includes("not configured")) {
      message = status.hint
        ? `Server storage is not configured. ${status.hint}`
        : `Server storage is not configured. Missing: ${status.missing.join(", ")}.`;
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
