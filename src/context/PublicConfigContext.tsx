"use client";

import { createContext, useContext } from "react";
import type { PublicRuntimeConfig } from "@/lib/public-config";

const PublicConfigContext = createContext<PublicRuntimeConfig | null>(null);

export function PublicConfigProvider({
  config,
  children,
}: {
  config: PublicRuntimeConfig;
  children: React.ReactNode;
}) {
  return (
    <PublicConfigContext.Provider value={config}>
      {children}
    </PublicConfigContext.Provider>
  );
}

export function usePublicConfig(): PublicRuntimeConfig {
  const config = useContext(PublicConfigContext);
  if (!config) {
    throw new Error("usePublicConfig must be used within PublicConfigProvider");
  }
  return config;
}
