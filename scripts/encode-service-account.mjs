/**
 * Print base64-encoded service account JSON for Cloudflare secrets.
 *
 * Usage:
 *   node scripts/encode-service-account.mjs path/to/key.json
 *   node scripts/encode-service-account.mjs   # reads GOOGLE_SERVICE_ACCOUNT_JSON from .env.local
 *
 * In Cloudflare, set secret:
 *   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<output>
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

const inputPath = process.argv[2];
let json;

if (inputPath) {
  json = readFileSync(resolve(inputPath), "utf8");
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
} else {
  console.error("Provide a JSON file path or set GOOGLE_SERVICE_ACCOUNT_JSON in .env.local");
  process.exit(1);
}

JSON.parse(json);
const encoded = Buffer.from(json.trim(), "utf8").toString("base64");

console.log(`
Cloudflare secret (recommended for multiline keys):

  Name:  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  Value: (copied below)

Also set runtime variable:
  FIREBASE_PROJECT_ID=pokerprobe-4c8f3

---
${encoded}
---
`);
