"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/firebase/verify-token";
import { auth } from "@/lib/firebase/client";
import type { Server } from "@/lib/firestore-server";
import { siteConfig } from "@/lib/config";
import {
  getPlanLabel,
  getServerDisplayStatus,
  isVisibleServerStatus,
} from "@/lib/servers";

function StatusDot({
  color,
}: {
  color: "gray" | "yellow" | "green" | "red" | "blue";
}) {
  const colors = {
    gray: "bg-gray-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      {(color === "green" || color === "blue") && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colors[color]}`}
        />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[color]}`}
      />
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400"
      aria-hidden="true"
    />
  );
}

function ServerTile({
  server,
  onManageBilling,
}: {
  server: Server;
  onManageBilling: () => void;
}) {
  const displayStatus = getServerDisplayStatus(server);
  const title = server.label || `${getPlanLabel(server.plan)} server`;
  const isSettingUp =
    server.status === "pending" || server.status === "provisioning";

  return (
    <div className="card-glow w-full rounded-xl border border-white/10 bg-felt-800/50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <div className="mt-2 flex items-center gap-2">
            <StatusDot color={displayStatus.color} />
            <span className="text-sm text-gray-300">{displayStatus.label}</span>
            {isSettingUp && <Spinner />}
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400">
          {getPlanLabel(server.plan)} plan
        </span>
      </div>

      {isSettingUp && (
        <p className="mt-4 text-sm text-gray-400">
          Setting up your server… {siteConfig.provisioningNote}
        </p>
      )}

      {server.status === "suspended" && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p>Your subscription payment is past due. Update billing to restore access.</p>
          <button
            type="button"
            onClick={onManageBilling}
            className="mt-2 font-medium text-gold-400 underline hover:text-gold-300"
          >
            Manage billing
          </button>
        </div>
      )}

      {server.status === "active" && (
        <>
          <dl className="mt-6 grid gap-3 border-t border-white/5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {server.hostname && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  Hostname
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-200">
                  {server.hostname}
                </dd>
              </div>
            )}
            {server.ip && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  IP
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-200">
                  {server.ip}
                </dd>
              </div>
            )}
            {server.username && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  Username
                </dt>
                <dd className="mt-1 font-mono text-sm text-gray-200">
                  {server.username}
                </dd>
              </div>
            )}
            {server.provisionedAt && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  Provisioned
                </dt>
                <dd className="mt-1 text-sm text-gray-200">
                  {new Date(server.provisionedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>

          {server.guacamoleUrl && (
            <a
              href={server.guacamoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-felt-950 transition hover:bg-gold-400"
            >
              Connect
            </a>
          )}

          <p className="mt-4 text-xs text-gray-500">
            Credentials were sent to {server.userEmail} when this server was
            provisioned.
          </p>
        </>
      )}
    </div>
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
    </div>
  );
}

function DashboardContent({ user }: { user: AuthUser }) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [serversError, setServersError] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    setLoadingServers(true);
    setServersError(null);

    try {
      const headers: HeadersInit = {};
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch("/api/servers", {
        headers,
        credentials: "same-origin",
      });

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
      setServers([]);
    } finally {
      setLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    void loadServers();
  }, [loadServers, success]);

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
          Subscription activated! We&apos;re setting up your server — you&apos;ll
          receive access details at {user.email} within{" "}
          {siteConfig.provisioningHours}.
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
          <NoServersMarketing />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Your servers</h2>
            {visibleServers.map((server) => (
              <ServerTile
                key={server.id}
                server={server}
                onManageBilling={handleManageBilling}
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

export function DashboardClient({ user }: { user: AuthUser }) {
  return (
    <Suspense fallback={<div className="p-12 text-gray-400">Loading…</div>}>
      <DashboardContent user={user} />
    </Suspense>
  );
}
