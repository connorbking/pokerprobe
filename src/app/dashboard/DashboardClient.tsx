"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { Server } from "@/lib/firestore-server";
import { siteConfig } from "@/lib/config";
import {
  isVisibleServerStatus,
} from "@/lib/servers";
import { ServerTile } from "@/components/ServerTile";

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400"
      aria-hidden="true"
    />
  );
}

function AddServerTile() {
  return (
    <Link
      href="/dashboard/plans"
      className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-felt-900/20 px-6 py-12 transition hover:border-gold-400/40 hover:bg-felt-800/30"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/20 text-3xl text-gray-400 transition group-hover:border-gold-400/50 group-hover:text-gold-400">
        +
      </div>
      <p className="mt-4 text-base font-medium text-white">Add Server</p>
    </Link>
  );
}

function NoServersMarketing() {
  return (
    <div className="card-glow rounded-xl border border-gold-400/20 bg-gradient-to-br from-felt-800/80 to-felt-900/80 p-8 text-center sm:p-10">
      <p className="text-sm font-medium uppercase tracking-wider text-gold-400">
        Get started
      </p>
      <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
        Run solvers 24/7 on dedicated hardware
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-gray-400">
        Subscribe to a plan and our team will provision your Windows server
        within {siteConfig.provisioningHours}. Perfect for HRC, Flopzilla,
        ICMIZER, and overnight simulation runs.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/dashboard/plans"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-6 py-3 text-sm font-semibold text-felt-950 transition hover:bg-gold-400"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [serversError, setServersError] = useState<string | null>(null);

  const clearServers = useCallback(() => {
    setServers([]);
    setServersError(null);
    setLoadingServers(false);
  }, []);

  const loadServers = useCallback(async (options?: { silent?: boolean }) => {
    if (!user?.uid) {
      clearServers();
      return;
    }

    if (!options?.silent) {
      setLoadingServers(true);
    }
    setServersError(null);

    try {
      const auth = getFirebaseAuth();
      const headers: HeadersInit = {};
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/servers", {
        headers,
        credentials: "same-origin",
      });

      if (res.status === 401) {
        clearServers();
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to load servers");
      }

      const data = (await res.json()) as { servers: Server[] };
      setServers(data.servers ?? []);
    } catch (err) {
      setServersError(
        err instanceof Error ? err.message : "Failed to load servers"
      );
      if (!options?.silent) {
        setServers([]);
      }
    } finally {
      if (!options?.silent) {
        setLoadingServers(false);
      }
    }
  }, [user?.uid, clearServers]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      clearServers();
      router.replace("/signin?callbackUrl=/dashboard");
    }
  }, [authLoading, user, router, clearServers]);

  useEffect(() => {
    if (!user?.uid) {
      clearServers();
      return;
    }
    void loadServers();
  }, [user?.uid, success, clearServers, loadServers]);

  useEffect(() => {
    if (!success || !user?.uid) return;

    const interval = setInterval(() => {
      void loadServers({ silent: true });
    }, 4000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [success, loadServers, user?.uid]);

  const visibleServers = servers.filter((s) => isVisibleServerStatus(s.status));
  const hasServers = visibleServers.length > 0;

  const handleManageBilling = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Unable to open billing portal");
    }
  };

  const handleLabelUpdated = (serverId: string, label: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === serverId ? { ...s, label } : s))
    );
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center gap-3 p-12 text-gray-400">
        <Spinner />
        {authLoading ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-400">
            Welcome back, {user.name ?? user.email}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/dashboard/plans"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-felt-950 transition hover:bg-gold-400"
          >
            <span className="text-base leading-none">+</span>
            Add Server
          </Link>
          {hasServers && (
            <button
              onClick={handleManageBilling}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
            >
              Manage billing
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Subscription activated! Your server is being prepared — stats will
          update below as setup completes.
        </div>
      )}
      {canceled && (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Checkout was canceled.{" "}
          <Link href="/dashboard/plans" className="underline hover:text-yellow-200">
            Choose a plan
          </Link>{" "}
          to try again.
        </div>
      )}

      {serversError && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {serversError}
        </div>
      )}

      <div className="mt-10">
        {loadingServers ? (
          <div className="flex items-center gap-3 text-gray-400">
            <Spinner />
            Loading your servers…
          </div>
        ) : !hasServers ? (
          success ? (
            <div className="card-glow rounded-xl border border-white/10 bg-felt-800/50 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Spinner />
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Preparing your server
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Your subscription is active. Server details will appear here
                    in a moment.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <NoServersMarketing />
          )
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Your servers</h2>
            {visibleServers.map((server) => (
              <ServerTile
                key={server.id}
                server={server}
                onManageBilling={handleManageBilling}
                onLabelUpdated={handleLabelUpdated}
              />
            ))}
            <AddServerTile />
          </div>
        )}
      </div>

      <p className="mt-10 text-center text-sm text-gray-500">
        Need help?{" "}
        <Link
          href={`mailto:${siteConfig.supportEmail}`}
          className="text-gold-400 hover:underline"
        >
          Contact support
        </Link>
      </p>
    </div>
  );
}

export function DashboardClient() {
  return (
    <Suspense fallback={<div className="p-12 text-gray-400">Loading…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
