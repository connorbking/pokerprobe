import { importPKCS8, SignJWT } from "jose";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: { values: value.map((item) => encodeValue(item)) },
    };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, val] of Object.entries(value)) {
      fields[key] = encodeValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(
  data: Record<string, unknown>
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = encodeValue(value);
  }
  return fields;
}

export function decodeValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((item) => decodeValue(item));
  }
  if ("mapValue" in value) {
    return decodeFields(value.mapValue.fields ?? {});
  }
  return null;
}

export function decodeFields(
  fields: Record<string, FirestoreValue>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = decodeValue(value);
  }
  return result;
}

function documentPath(projectId: string, path: string): string {
  const normalized = path.replace(/^\/+/, "");
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${normalized}`;
}

export async function getAccessToken(
  serviceAccountJson: string
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const key = await importPKCS8(sa.private_key, "RS256");

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Firestore access token: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function firestoreGet(
  projectId: string,
  path: string,
  token: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(documentPath(projectId, path), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Firestore GET ${path} failed: ${await res.text()}`);
  }

  const doc = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return decodeFields(doc.fields ?? {});
}

export async function firestoreSet(
  projectId: string,
  path: string,
  data: Record<string, unknown>,
  token: string
): Promise<void> {
  const normalized = path.replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  const collection = normalized.slice(0, slash);
  const docId = normalized.slice(slash + 1);

  const url = `${documentPath(projectId, collection)}?documentId=${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });

  if (!res.ok) {
    throw new Error(`Firestore SET ${path} failed: ${await res.text()}`);
  }
}

export async function firestoreUpdate(
  projectId: string,
  path: string,
  data: Record<string, unknown>,
  token: string
): Promise<void> {
  const fieldPaths = Object.keys(data);
  const mask = fieldPaths
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");

  const res = await fetch(`${documentPath(projectId, path)}?${mask}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });

  if (!res.ok) {
    throw new Error(`Firestore UPDATE ${path} failed: ${await res.text()}`);
  }
}

export async function firestoreQuery(
  projectId: string,
  collection: string,
  field: string,
  value: string,
  token: string
): Promise<Record<string, unknown>[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Firestore QUERY ${collection} failed: ${await res.text()}`);
  }

  const rows = (await res.json()) as Array<{
    document?: { fields?: Record<string, FirestoreValue> };
  }>;

  return rows
    .filter((row) => row.document?.fields)
    .map((row) => decodeFields(row.document!.fields!));
}
