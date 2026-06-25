import { NextResponse } from "next/server";
import { isFirebaseConfigConfigured } from "@/lib/public-config";
import { getPublicRuntimeConfig } from "@/lib/runtime-config";

export async function GET() {
  const config = getPublicRuntimeConfig();
  const firebaseConfigured = isFirebaseConfigConfigured(config.firebase);

  return NextResponse.json({
    runtime: {
      firebaseConfigured,
      stripePublishableKeySet: Boolean(config.stripePublishableKey),
      firebase: {
        hasApiKey: Boolean(config.firebase.apiKey),
        hasAuthDomain: Boolean(config.firebase.authDomain),
        hasProjectId: Boolean(config.firebase.projectId),
        hasAppId: Boolean(config.firebase.appId),
      },
    },
  });
}
