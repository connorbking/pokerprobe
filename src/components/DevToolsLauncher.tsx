"use client";

import { useDevTools } from "@/context/DevToolsContext";
import { DevToolsModal } from "@/components/DevToolsModal";

export function DevToolsLauncher() {
  const { devToolsActive, isAdmin, adminLoading, openModal } = useDevTools();

  if (!devToolsActive || adminLoading || !isAdmin) {
    return <DevToolsModal />;
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-200 transition hover:border-purple-400/50 hover:bg-purple-500/20"
      >
        Dev Tools
      </button>
      <DevToolsModal />
    </>
  );
}
