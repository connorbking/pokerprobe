"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import type { FirebasePublicConfig } from "@/lib/public-config";
import { isFirebaseConfigConfigured } from "@/lib/public-config";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function initFirebaseClient(
  config: FirebasePublicConfig
): Auth | null {
  if (!isFirebaseConfigConfigured(config)) {
    firebaseApp = null;
    firebaseAuth = null;
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
  }

  return firebaseAuth;
}

export function getFirebaseAuth(): Auth | null {
  return firebaseAuth;
}
