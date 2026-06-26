"use client";

import { useMemo } from "react";
import type { Server } from "@/lib/firestore-server";
import { usePublicConfig } from "@/context/PublicConfigContext";
import { useDevTools } from "@/context/DevToolsContext";
import { canAccessServerManage, isServerOnline } from "@/lib/servers";

export function useEffectiveServerOnline(server: Pick<Server, "status">): boolean {
  const { isAdmin, toggles, devToolsActive } = useDevTools();

  if (isServerOnline(server)) {
    return true;
  }

  return devToolsActive && isAdmin && toggles.mockServerOnline;
}

export function useCanAccessServerManage(server: Pick<Server, "status">): boolean {
  const { allowManageBeforeOnline } = usePublicConfig();
  const { isAdmin, toggles, devToolsActive } = useDevTools();
  const effectiveOnline = useEffectiveServerOnline(server);

  if (effectiveOnline) {
    return true;
  }

  const allowBeforeOnline =
    allowManageBeforeOnline ||
    (devToolsActive && isAdmin && toggles.allowManageBeforeOnline);

  return canAccessServerManage(server, { allowBeforeOnline });
}

export function useDevToolsPreviewMode(server: Pick<Server, "status">): boolean {
  const { isAdmin, toggles, devToolsActive } = useDevTools();

  return (
    devToolsActive &&
    isAdmin &&
    !isServerOnline(server) &&
    (toggles.allowManageBeforeOnline || toggles.mockServerOnline)
  );
}

export function useAdminImmediateCancelEnabled(): boolean {
  const { isAdmin, toggles, devToolsActive } = useDevTools();

  return (
    devToolsActive &&
    isAdmin &&
    toggles.immediatelyCancelSubscriptions
  );
}

export function useDevLogging() {
  const { toggles, devToolsActive, isAdmin } = useDevTools();

  return useMemo(
    () =>
      devToolsActive &&
      isAdmin &&
      toggles.verboseClientLogging &&
      typeof console !== "undefined"
        ? console
        : null,
    [devToolsActive, isAdmin, toggles.verboseClientLogging]
  );
}
