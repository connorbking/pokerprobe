"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  DEV_TOOLS_ENABLED,
  DEV_TOOLS_STORAGE_KEY,
  defaultDevToolToggleState,
  parseDevToolToggleState,
  type DevToolToggleId,
  type DevToolToggleState,
} from "@/lib/dev-tools-config";

interface DevToolsContextValue {
  devToolsActive: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  toggles: DevToolToggleState;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  setToggle: (id: DevToolToggleId, value: boolean) => void;
  resetToggles: () => void;
  refreshAdminStatus: () => Promise<void>;
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

async function fetchAdminStatus(): Promise<boolean> {
  const auth = getFirebaseAuth();
  const headers: HeadersInit = {};
  if (auth?.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }

  const res = await fetch("/api/me", {
    headers,
    credentials: "same-origin",
  });

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as { isAdmin?: boolean };
  return data.isAdmin === true;
}

export function DevToolsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toggles, setToggles] = useState<DevToolToggleState>(
    defaultDevToolToggleState
  );

  const devToolsActive = DEV_TOOLS_ENABLED;

  useEffect(() => {
    setToggles(parseDevToolToggleState(localStorage.getItem(DEV_TOOLS_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(DEV_TOOLS_STORAGE_KEY, JSON.stringify(toggles));
  }, [toggles]);

  const refreshAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    try {
      setIsAdmin(await fetchAdminStatus());
    } catch {
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshAdminStatus();
  }, [authLoading, refreshAdminStatus]);

  const setToggle = useCallback((id: DevToolToggleId, value: boolean) => {
    setToggles((prev) => ({ ...prev, [id]: value }));
  }, []);

  const resetToggles = useCallback(() => {
    setToggles(defaultDevToolToggleState());
  }, []);

  const value = useMemo(
    () => ({
      devToolsActive,
      isAdmin,
      adminLoading,
      toggles,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      setToggle,
      resetToggles,
      refreshAdminStatus,
    }),
    [
      devToolsActive,
      isAdmin,
      adminLoading,
      toggles,
      modalOpen,
      setToggle,
      resetToggles,
      refreshAdminStatus,
    ]
  );

  return (
    <DevToolsContext.Provider value={value}>{children}</DevToolsContext.Provider>
  );
}

export function useDevTools(): DevToolsContextValue {
  const context = useContext(DevToolsContext);
  if (!context) {
    throw new Error("useDevTools must be used within DevToolsProvider");
  }
  return context;
}
