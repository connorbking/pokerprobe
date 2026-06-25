export interface FirestoreConfig {
  projectId: string;
  serviceAccountJson: string;
}

export interface FirestoreConfigStatus {
  configured: boolean;
  hasProjectId: boolean;
  hasServiceAccount: boolean;
  missing: string[];
}

function decodeBase64Json(value: string): string | null {
  try {
    const binary = atob(value.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

/** Parse service account JSON from Cloudflare/env (handles quoting and base64). */
export function parseServiceAccountJson(
  raw: string | undefined
): string | null {
  if (!raw?.trim()) return null;

  let value = raw.trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      const unquoted = JSON.parse(value) as unknown;
      if (typeof unquoted === "string") {
        value = unquoted;
      }
    } catch {
      // keep original value
    }
  }

  try {
    JSON.parse(value);
    return value;
  } catch {
    return decodeBase64Json(value);
  }
}

export function getFirestoreConfigStatus(): FirestoreConfigStatus {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountJson =
    parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) ??
    parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64);

  const hasProjectId = Boolean(projectId?.trim());
  const hasServiceAccount = Boolean(serviceAccountJson);
  const missing: string[] = [];

  if (!hasProjectId) {
    missing.push("FIREBASE_PROJECT_ID");
  }
  if (!hasServiceAccount) {
    missing.push(
      "GOOGLE_SERVICE_ACCOUNT_JSON (single-line JSON) or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64"
    );
  }

  return {
    configured: hasProjectId && hasServiceAccount,
    hasProjectId,
    hasServiceAccount,
    missing,
  };
}

export function getFirestoreConfig(): FirestoreConfig {
  const status = getFirestoreConfigStatus();
  if (!status.configured) {
    throw new Error(
      `Firestore is not configured. Missing: ${status.missing.join(", ")}.`
    );
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  const serviceAccountJson =
    parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) ??
    parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64)!;

  return { projectId: projectId!.trim(), serviceAccountJson };
}
