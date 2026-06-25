"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { AuthUser } from "@/lib/firebase/verify-token";
import { siteConfig } from "@/lib/config";
import {
  getServerDisplayStatus,
  type CustomerServer,
} from "@/lib/servers";

function StatusDot({ color }: { color: "gray" | "yellow" | "green" | "red" }) {
  const colors = {
    gray: "bg-gray-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    red: "bg-red-500",
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      {color === "green" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[color]}`}
      />
    </span>
  );
}

function ServerTile({ server }: { server: CustomerServer }) {
  const displayStatus = getServerDisplayStatus(server);
  const title = server.label ?? `Dedicated Server · ${server.plan ?? "Standard"}`;

  return (
    <div className="card-glow w-full rounded-xl border border-white/10 bg-felt-800/50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <div className="mt-2 flex items-center gap-2">
            <StatusDot color={displayStatus.color} />
            <span className="text-sm text-gray-300">{displayStatus.label}</span>
          </div>
        </div>
        {server.plan && (
          <span className="inline-flex w-fit rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400">
            {server.plan} plan
          </span>
        )}
      </div>

      {server.status === "active" && server.host && (
        <dl className="mt-6 grid gap-3 border-t border-white/5 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Host
            </dt>
            <dd className="mt-1 font-mono text-sm text-gray-200">
              {server.host}
            </dd>
          </div>
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
                {server.provisionedAt}
              </dd>
            </div>
          )}
        </dl>
      )}

      {server.status === "pending" && (
        <p className="mt-4 text-sm text-gray-400">{siteConfig.provisioningNote}</p>
      )}

      {server.status === "active" && (
        <p className="mt-4 text-xs text-gray-500">
          RDP password was sent to your email when this server was provisioned.
        </p>
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

function DashboardContent({
  user,
  servers,
}: {
  user: AuthUser;
  servers: CustomerServer[];
}) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const visibleServers = servers.filter((s) => s.status !== "suspended");
  const hasServers = visibleServers.length > 0;

  const handleManageBilling = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
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
          Subscription activated! Our team will manually set up your dedicated
          server within {siteConfig.provisioningHours}. You&apos;ll receive RDP
          credentials at {user.email}.
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

      <div className="mt-10">
        {!hasServers ? (
          <NoServersMarketing />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Your servers</h2>
            {visibleServers.map((server) => (
              <ServerTile key={server.id} server={server} />
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

export function DashboardClient({
  user,
  servers,
}: {
  user: AuthUser;
  servers: CustomerServer[];
}) {
  return (
    <Suspense fallback={<div className="p-12 text-gray-400">Loading…</div>}>
      <DashboardContent user={user} servers={servers} />
    </Suspense>
  );
}
