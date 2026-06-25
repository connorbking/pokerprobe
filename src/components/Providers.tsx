"use client";

import { AuthProvider } from "@/context/AuthContext";
import { PublicConfigProvider } from "@/context/PublicConfigContext";
import type { PublicRuntimeConfig } from "@/lib/public-config";

export function Providers({
  config,
  children,
}: {
  config: PublicRuntimeConfig;
  children: React.ReactNode;
}) {
  return (
    <PublicConfigProvider config={config}>
      <AuthProvider firebaseConfig={config.firebase}>{children}</AuthProvider>
    </PublicConfigProvider>
  );
}
