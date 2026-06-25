import { getFirebaseProjectId } from "./runtime-config";

export interface FirestoreConfig {
  projectId: string;
  serviceAccountJson: string;
}

export interface FirestoreConfigStatus {
  configured: boolean;
  hasProjectId: boolean;
  hasServiceAccount: boolean;
  serviceAccountEnvPresent: boolean;
  serviceAccountBase64EnvPresent: boolean;
  invalidServiceAccountJson: boolean;
  missing: string[];
  hint?: string;
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

function serviceAccountHint(
  jsonPresent: boolean,
  base64Present: boolean,
  parseable: boolean
): string | undefined {
  if (parseable) return undefined;
  if (jsonPresent || base64Present) {
    return "Service account env var is set but invalid. Use minified single-line JSON or run: node scripts/encode-service-account.mjs key.json and set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.";
  }
  return "Add GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 as a Secret under Settings → Variables and secrets (runtime — not Build variables). Copy the same secrets to runtime that the Worker needs at request time, then Retry deployment.";
}

export function getFirestoreConfigStatus(): FirestoreConfigStatus {
  const projectId = getFirebaseProjectId();

  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  const rawBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim() ?? "";
  const serviceAccountJson =
    parseServiceAccountJson(rawJson || undefined) ??
    parseServiceAccountJson(rawBase64 || undefined);

  const hasProjectId = Boolean(projectId?.trim());
  const serviceAccountEnvPresent = rawJson.length > 0;
  const serviceAccountBase64EnvPresent = rawBase64.length > 0;
  const hasServiceAccount = Boolean(serviceAccountJson);
  const invalidServiceAccountJson =
    (serviceAccountEnvPresent || serviceAccountBase64EnvPresent) &&
    !hasServiceAccount;

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
    serviceAccountEnvPresent,
    serviceAccountBase64EnvPresent,
    invalidServiceAccountJson,
    missing,
    hint: serviceAccountHint(
      serviceAccountEnvPresent,
      serviceAccountBase64EnvPresent,
      hasServiceAccount
    ),
  };
}

export function getFirestoreConfig(): FirestoreConfig {
  const status = getFirestoreConfigStatus();
  if (!status.configured) {
    const detail = status.invalidServiceAccountJson
      ? "GOOGLE_SERVICE_ACCOUNT_JSON is set but could not be parsed as JSON or base64"
      : status.missing.join(", ");
    throw new Error(`Firestore is not configured. Missing: ${detail}.`);
  }

  const projectId = getFirebaseProjectId();
  const serviceAccountJson =
    parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) ??
    parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64)!;

  return { projectId: projectId!.trim(), serviceAccountJson };
}
