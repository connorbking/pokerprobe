/**
 * Test Firestore REST connectivity (server-side credentials).
 *
 * Usage:
 *   node scripts/test-firestore.mjs
 *
 * Requires in .env.local:
 *   FIREBASE_PROJECT_ID=pokerprobe-4c8f3
 *   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

function loadEnvFile() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const projectId =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!projectId) {
  console.error("Missing FIREBASE_PROJECT_ID");
  process.exit(1);
}

if (!saJson) {
  console.error(`
GOOGLE_SERVICE_ACCOUNT_JSON is not set.

1. Firebase Console → Project settings → Service accounts
2. Generate new private key (JSON file)
3. Paste the entire JSON as one line in .env.local:

GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

Also enable Firestore: Build → Firestore Database → Create database
`);
  process.exit(1);
}

const { getAccessToken, firestoreSet, firestoreGet, firestoreQuery } =
  await import("../src/lib/firestore.ts");

const token = await getAccessToken(saJson);
console.log("✓ OAuth token obtained");

const testId = `test_${Date.now()}`;
await firestoreSet(
  projectId,
  `servers/${testId}`,
  {
    id: testId,
    userId: "test-user",
    userEmail: "test@example.com",
    status: "pending",
    plan: "starter",
    label: "Firestore connectivity test",
    createdAt: new Date().toISOString(),
  },
  token
);
console.log(`✓ Wrote servers/${testId}`);

const doc = await firestoreGet(projectId, `servers/${testId}`, token);
console.log("✓ Read back:", doc?.label);

const results = await firestoreQuery(
  projectId,
  "servers",
  "userId",
  "test-user",
  token
);
console.log(`✓ Query returned ${results.length} server(s)`);

console.log("\nFirestore REST client is working.");
console.log(`Project: ${projectId}`);
console.log("View data: https://console.firebase.google.com/project/pokerprobe-4c8f3/firestore");
