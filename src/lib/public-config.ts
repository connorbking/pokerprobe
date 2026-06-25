/** Client-safe Firebase web config (no secrets). */
export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

/** Public config passed from the server at request time (Cloudflare runtime env). */
export type PublicRuntimeConfig = {
  firebase: FirebasePublicConfig;
  stripePublishableKey: string;
};

export function isFirebaseConfigConfigured(
  config: FirebasePublicConfig
): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.appId
  );
}
