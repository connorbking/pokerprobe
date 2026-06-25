"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "./config";

function createFirebaseApp() {
  if (!isFirebaseConfigured()) {
    return null;
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp = createFirebaseApp();
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
