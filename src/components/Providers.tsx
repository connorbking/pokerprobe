"use client";

import { AuthProvider } from "@/context/AuthContext";
import { DevToolsProvider } from "@/context/DevToolsContext";
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
      <AuthProvider firebaseConfig={config.firebase}>
        <DevToolsProvider>{children}</DevToolsProvider>
      </AuthProvider>
    </PublicConfigProvider>
  );
}
