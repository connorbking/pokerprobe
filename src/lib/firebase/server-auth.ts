import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./config";
import { verifyFirebaseToken, type AuthUser } from "./verify-token";

export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyFirebaseToken(token);
}

export async function getServerUserFromRequest(
  request: Request
): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return verifyFirebaseToken(header.slice(7));
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`)
  );
  if (!match?.[1]) return null;
  return verifyFirebaseToken(decodeURIComponent(match[1]));
}
