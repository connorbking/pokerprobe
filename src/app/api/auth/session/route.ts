import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/firebase/config";
import { getServerUserFromRequest } from "@/lib/firebase/server-auth";
import { verifyFirebaseToken } from "@/lib/firebase/verify-token";
import { syncFirestoreUserOnAuth } from "@/lib/firestore-server";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 5,
};

export async function GET(request: Request) {
  const user = await getServerUserFromRequest(request);

  if (user?.uid && user.email) {
    try {
      await syncFirestoreUserOnAuth(user.uid, user.email);
    } catch (err) {
      console.error("[auth/session GET] Firestore user sync failed:", err);
    }
  }

  return NextResponse.json({ user: user ?? null });
}

export async function POST(request: Request) {
  let body: { idToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { idToken } = body;
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const user = await verifyFirebaseToken(idToken);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    await syncFirestoreUserOnAuth(user.uid, user.email);
  } catch (err) {
    console.error("[auth/session POST] Firestore user sync failed:", err);
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(SESSION_COOKIE, idToken, cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
