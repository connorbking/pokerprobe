import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

export function loadEnvFile() {
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

export function getFirestoreCredentials() {
  loadEnvFile();

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

  return { projectId, saJson };
}
