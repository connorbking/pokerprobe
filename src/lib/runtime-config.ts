import type { FirebasePublicConfig, PublicRuntimeConfig } from "./public-config";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getFirebaseProjectId(): string {
  return env("FIREBASE_PROJECT_ID") || env("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
}

function getFirebasePublicConfig(): FirebasePublicConfig {
  return {
    apiKey: env("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId:
      env("NEXT_PUBLIC_FIREBASE_PROJECT_ID") || getFirebaseProjectId(),
    storageBucket: env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: env("NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId: env("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") || undefined,
  };
}

/** Read public config from Cloudflare runtime env (server components & API routes). */
export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  const manageFlag = env("ALLOW_MANAGE_BEFORE_ONLINE");
  return {
    firebase: getFirebasePublicConfig(),
    stripePublishableKey:
      env("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") ||
      env("STRIPE_PUBLISHABLE_KEY"),
    // Default true until provisioning marks servers Online; set ALLOW_MANAGE_BEFORE_ONLINE=false to enforce.
    allowManageBeforeOnline: manageFlag !== "false",
  };
}
