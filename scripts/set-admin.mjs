/**
 * Grant or revoke Firestore admin permissions (isAdmin) for a user by email.
 *
 * Usage:
 *   node scripts/set-admin.mjs cbking2292@gmail.com
 *   node scripts/set-admin.mjs cbking2292@gmail.com --revoke
 *
 * Requires in .env.local:
 *   FIREBASE_PROJECT_ID
 *   GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");
const DEFAULT_EMAIL = "cbking2292@gmail.com";

function loadEnvFile() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const emailArg = process.argv[2] ?? DEFAULT_EMAIL;
const revoke = process.argv.includes("--revoke");
const email = emailArg.toLowerCase();

const projectId =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!saJson && process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
  saJson = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    "base64"
  ).toString("utf8");
}

if (!projectId || !saJson) {
  console.error(
    "Missing FIREBASE_PROJECT_ID and GOOGLE_SERVICE_ACCOUNT_JSON (or _BASE64) in .env.local"
  );
  process.exit(1);
}

const { getAccessToken, firestoreQuery, firestoreUpdate, firestoreGet } =
  await import("../src/lib/firestore.ts");

const token = await getAccessToken(saJson);

let docs = await firestoreQuery(projectId, "users", "email", email, token);

if (docs.length === 0) {
  docs = await firestoreQuery(
    projectId,
    "users",
    "email",
    emailArg,
    token
  );
}

const user = docs[0];
if (!user?.uid) {
  console.error(`
No Firestore user found for ${email}.

1. Sign in at https://www.pokerprobe.com/signin (or localhost) once with this account.
2. Rerun: node scripts/set-admin.mjs ${email}
`);
  process.exit(1);
}

const uid = user.uid;
await firestoreUpdate(
  projectId,
  `users/${uid}`,
  { isAdmin: !revoke, email },
  token
);

const updated = await firestoreGet(projectId, `users/${uid}`, token);
console.log(
  `${revoke ? "Revoked" : "Granted"} admin for ${email} (uid: ${uid})`
);
console.log("User record:", updated);
