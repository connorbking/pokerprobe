import { createRemoteJWKSet, jwtVerify } from "jose";
import { getFirebaseProjectId } from "@/lib/runtime-config";

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export async function verifyFirebaseToken(
  token: string
): Promise<AuthUser | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: 60,
    });

    return {
      uid: payload.sub!,
      email: (payload.email as string | undefined) ?? null,
      name: (payload.name as string | undefined) ?? null,
      picture: (payload.picture as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
