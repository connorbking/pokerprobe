/**
 * Creates PokerProbe subscription products in Stripe test mode.
 *
 * Usage (from project root):
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs
 *
 * Or add STRIPE_SECRET_KEY to .env.local and run:
 *   npm run setup-stripe
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

function loadEnvFile() {
  if (!existsSync(ENV_PATH)) return;
  const content = readFileSync(ENV_PATH, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error(
    "Missing STRIPE_SECRET_KEY. Add it to .env.local or pass it inline."
  );
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  apiVersion: "2025-08-27.basil",
});

const plans = [
  {
    id: "hobby",
    name: "PokerProbe Hobby",
    description: "OVH b3-16 — 4 vCPU / 16 GB — Flopzilla, ICMIZER & light review",
    amount: 19900,
    envKey: "STRIPE_PRICE_HOBBY",
    legacyEnvKey: "STRIPE_PRICE_STARTER",
  },
  {
    id: "grind",
    name: "PokerProbe Grind",
    description: "OVH b3-32 — 8 vCPU / 32 GB — GTO+ & overnight HRC",
    amount: 34900,
    envKey: "STRIPE_PRICE_GRIND",
    legacyEnvKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "deepstack",
    name: "PokerProbe Deep Stack",
    description: "OVH b3-64 — 16 vCPU / 64 GB — PioSolver postflop & HRC Pro",
    amount: 57900,
    envKey: "STRIPE_PRICE_DEEPSTACK",
    legacyEnvKey: "STRIPE_PRICE_ELITE",
  },
];

const created = {};

for (const plan of plans) {
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: {
      app: "pokerprobe",
      planId: plan.id,
      ovhFlavor:
        plan.id === "hobby"
          ? "b3-16"
          : plan.id === "grind"
            ? "b3-32"
            : "b3-64",
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: {
      app: "pokerprobe",
      planId: plan.id,
    },
  });

  created[plan.envKey] = price.id;
  created[plan.legacyEnvKey] = price.id;
  console.log(`✓ ${plan.name}: ${price.id} ($${plan.amount / 100}/mo)`);
}

console.log(
  "\nNote: Omega (Enterprise) uses dynamic Stripe Checkout price_data — no fixed price ID."
);

const storageTiers = [
  {
    id: "pro1tb",
    name: "PokerProbe 1 TB Pro Vault",
    description: "1 TB permanent cloud vault add-on",
    amount: 1900,
    envKey: "STRIPE_STORAGE_PRICE_1TB",
    publicEnvKey: "NEXT_PUBLIC_STRIPE_STORAGE_PRICE_1TB",
    limitGB: 1024,
  },
  {
    id: "master4tb",
    name: "PokerProbe 4 TB Stable Master",
    description: "4 TB permanent cloud vault add-on",
    amount: 11900,
    envKey: "STRIPE_STORAGE_PRICE_4TB",
    publicEnvKey: "NEXT_PUBLIC_STRIPE_STORAGE_PRICE_4TB",
    limitGB: 4096,
  },
];

for (const tier of storageTiers) {
  const product = await stripe.products.create({
    name: tier.name,
    description: tier.description,
    metadata: {
      app: "pokerprobe",
      kind: "storage_vault",
      tierId: tier.id,
      limitGB: String(tier.limitGB),
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: tier.amount,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: {
      app: "pokerprobe",
      kind: "storage_vault",
      tierId: tier.id,
      limitGB: String(tier.limitGB),
    },
  });

  created[tier.envKey] = price.id;
  created[tier.publicEnvKey] = price.id;
  console.log(`✓ ${tier.name}: ${price.id} ($${tier.amount / 100}/mo)`);
}

let envContent = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";

for (const [key, value] of Object.entries(created)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(envContent)) {
    envContent = envContent.replace(pattern, line);
  } else {
    envContent = envContent.trimEnd() + `\n${line}\n`;
  }
}

if (!envContent.includes("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=")) {
  console.log(
    "\nNote: Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... to .env.local manually."
  );
}

const envOutput = envContent.endsWith("\n") ? envContent : `${envContent}\n`;

try {
  writeFileSync(ENV_PATH, envOutput);
  console.log(`\nUpdated ${ENV_PATH} with new price IDs.`);
} catch (err) {
  if (err?.code === "EPERM" || err?.code === "EACCES") {
    console.warn(
      `\nCould not write ${ENV_PATH} (${err.code}). Add or update these lines manually:\n`
    );
    for (const [key, value] of Object.entries(created)) {
      console.log(`${key}=${value}`);
    }
    process.exit(0);
  }
  throw err;
}
