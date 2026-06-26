"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { FirebasePublicConfig } from "@/lib/public-config";
import { isFirebaseConfigConfigured } from "@/lib/public-config";
import { getFirebaseAuth, initFirebaseClient } from "@/lib/firebase/client";
import type { AuthUser } from "@/lib/firebase/verify-token";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let lastSessionSyncAt = 0;
let sessionSyncPromise: Promise<void> | null = null;
let explicitSignOut = false;

function mapUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    picture: user.photoURL,
  };
}

async function establishSession(
  user: User,
  { forceRefresh = false }: { forceRefresh?: boolean } = {}
): Promise<void> {
  const now = Date.now();
  if (!forceRefresh && now - lastSessionSyncAt < 60_000) {
    return;
  }

  if (sessionSyncPromise) {
    await sessionSyncPromise;
    if (!forceRefresh && Date.now() - lastSessionSyncAt < 60_000) {
      return;
    }
  }

  sessionSyncPromise = (async () => {
    const idToken = await user.getIdToken(forceRefresh);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "same-origin",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Failed to establish session");
    }
    lastSessionSyncAt = Date.now();
  })();

  try {
    await sessionSyncPromise;
  } finally {
    sessionSyncPromise = null;
  }
}

async function clearSession() {
  lastSessionSyncAt = 0;
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
  });
}

async function fetchSessionUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}

function assertAuth() {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error(
      "Firebase is not configured. Add Firebase env variables to Cloudflare runtime."
    );
  }
  return firebaseAuth;
}

export function AuthProvider({
  firebaseConfig,
  children,
}: {
  firebaseConfig: FirebasePublicConfig;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigConfigured(firebaseConfig);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const sessionUser = await fetchSessionUser();
      if (!cancelled && sessionUser) {
        setUser(sessionUser);
      }

      const firebaseAuth = configured
        ? initFirebaseClient(firebaseConfig)
        : null;

      if (!firebaseAuth) {
        if (!cancelled) setLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        if (cancelled) return;

        if (firebaseUser) {
          setUser(mapUser(firebaseUser));
          setLoading(false);
          void establishSession(firebaseUser).catch(() => {
            // Cookie sync failed; client auth state is still usable.
          });
          return;
        }

        if (explicitSignOut) {
          setUser(null);
          setLoading(false);
          return;
        }

        void fetchSessionUser().then((sessionUser) => {
          if (!cancelled) {
            setUser(sessionUser);
            setLoading(false);
          }
        });
      });

      return unsubscribe;
    }

    let unsubscribe: (() => void) | undefined;
    void init().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [
    configured,
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.appId,
  ]);

  const signInWithGoogle = useCallback(async () => {
    const firebaseAuth = assertAuth();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(firebaseAuth, provider);
    await establishSession(cred.user, { forceRefresh: true });
    setUser(mapUser(cred.user));
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const firebaseAuth = assertAuth();
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await establishSession(cred.user, { forceRefresh: true });
    setUser(mapUser(cred.user));
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const firebaseAuth = assertAuth();
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await establishSession(cred.user, { forceRefresh: true });
    setUser(mapUser(cred.user));
  }, []);

  const signOut = useCallback(async () => {
    explicitSignOut = true;
    try {
      await clearSession();
      setUser(null);
      const firebaseAuth = getFirebaseAuth();
      if (firebaseAuth) {
        await firebaseSignOut(firebaseAuth);
      }
      router.replace("/signin");
    } finally {
      explicitSignOut = false;
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [
      user,
      loading,
      configured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
