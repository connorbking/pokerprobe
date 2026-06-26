"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Server } from "@/lib/firestore-server";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { siteConfig } from "@/lib/config";
import {
  getPlanLabel,
  getServerDisplayStatus,
  getServerStatusLabel,
  getServerStatusLightColor,
} from "@/lib/servers";
import { getServerAddress, getServerStatRows, isServerSettingUp } from "@/lib/server-display";
import { getSimsForPlan, simNameFromTag } from "@/lib/sim-catalog";
import { ServerLabelEditor } from "@/components/ServerLabelEditor";
import { PlanPanel } from "@/components/PlanPanel";
import {
  useCanAccessServerManage,
  useDevToolsPreviewMode,
  useEffectiveServerOnline,
} from "@/lib/dev-tools-hooks";

export type ManageTab =
  | "desktop"
  | "sims"
  | "files"
  | "activity"
  | "settings"
  | "plan"
  | "terminal";

const tabs: Array<{ id: ManageTab; label: string; description: string }> = [
  { id: "desktop", label: "Desktop", description: "Your Windows workspace" },
  { id: "sims", label: "Simulators", description: "Poker tools on this server" },
  { id: "files", label: "Files", description: "SFTP file management" },
  { id: "activity", label: "Activity", description: "Recent server events" },
  { id: "settings", label: "Settings", description: "Name and preferences" },
  { id: "plan", label: "Plan", description: "Subscription and billing" },
  { id: "terminal", label: "Terminal", description: "Command-line access" },
];

function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400"
      aria-hidden="true"
    />
  );
}

async function fetchServer(serverId: string): Promise<Server> {
  const auth = getFirebaseAuth();
  const headers: HeadersInit = {};
  if (auth?.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }

  const res = await fetch(`/api/servers/${serverId}`, {
    headers,
    credentials: "same-origin",
  });

  const data = (await res.json()) as { server?: Server; error?: string };
  if (res.status === 401) {
    throw new Error("Sign in required");
  }
  if (!res.ok || !data.server) {
    throw new Error(data.error ?? "Failed to load server");
  }
  return data.server;
}

function PanelPlaceholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-felt-900/30 px-6 py-12 text-center">
      <p className="font-medium text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">{body}</p>
    </div>
  );
}

function DesktopPanel({ server }: { server: Server }) {
  const settingUp = isServerSettingUp(server);

  if (settingUp) {
    return (
      <PanelPlaceholder
        title="Desktop not ready yet"
        body="Your workspace will appear here once setup completes. We'll enable browser access automatically."
      />
    );
  }

  if (server.status === "suspended") {
    return (
      <PanelPlaceholder
        title="Desktop unavailable"
        body="Update billing to restore access to your workspace."
      />
    );
  }

  if (!server.guacamoleUrl) {
    return (
      <PanelPlaceholder
        title="Connecting your desktop"
        body="Your browser workspace link is being configured. Check back shortly."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <a
          href={server.guacamoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-felt-950 hover:bg-gold-400"
        >
          Open desktop
        </a>
        <p className="self-center text-sm text-gray-400">
          Full-screen workspace — optimized for solver sessions.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <iframe
          src={server.guacamoleUrl}
          title={`${server.label} desktop`}
          className="h-[min(70vh,640px)] w-full bg-felt-950"
          allow="clipboard-read; clipboard-write"
        />
      </div>
      <p className="text-xs text-gray-500">
        If the embed does not load, use Open desktop for the full workspace view.
      </p>
    </div>
  );
}

function SimsPanel({ server }: { server: Server }) {
  const planSims = getSimsForPlan(server.plan);
  const installed = new Set(server.installedSims ?? []);
  const settingUp = isServerSettingUp(server);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Simulators included with your {getPlanLabel(server.plan)} plan. Installs
        are applied automatically during server setup using your plan profile.
      </p>
      <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-felt-800/40">
        {planSims.map((sim) => {
          const isInstalled = installed.has(sim.id) || installed.has(sim.tag);
          return (
            <li
              key={sim.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="font-medium text-white">{sim.name}</p>
                <p className="text-xs text-gray-500">{sim.tag}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  settingUp
                    ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                    : isInstalled
                      ? "border border-green-500/30 bg-green-500/10 text-green-200"
                      : "border border-white/10 bg-white/5 text-gray-400"
                }`}
              >
                {settingUp
                  ? "Queued"
                  : isInstalled
                    ? "Installed"
                    : "Pending install"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilesPanel({ server }: { server: Server }) {
  const address = getServerAddress(server);
  const settingUp = isServerSettingUp(server);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Transfer hand histories, solver exports, and configs via SFTP. A built-in
        file browser is coming soon — use any SFTP client in the meantime.
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-felt-800/40 p-4">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Host</dt>
          <dd className="mt-1 font-mono text-sm text-gray-200">
            {settingUp ? "Assigning Subdomain" : address}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-felt-800/40 p-4">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Protocol</dt>
          <dd className="mt-1 font-mono text-sm text-gray-200">SFTP · port 22</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-felt-800/40 p-4">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Username</dt>
          <dd className="mt-1 font-mono text-sm text-gray-200">
            {server.username ?? (settingUp ? "—" : "Sent to your email")}
          </dd>
        </div>
      </dl>
      <PanelPlaceholder
        title="Web file manager"
        body="Drag-and-drop uploads and folder browsing from your browser are on the roadmap."
      />
    </div>
  );
}

function ActivityPanel({ server }: { server: Server }) {
  const events = [
    server.createdAt && {
      at: server.createdAt,
      message: "Subscription activated — server queued for setup",
    },
    server.provisionedAt && {
      at: server.provisionedAt,
      message: "Server provisioned and workspace enabled",
    },
  ].filter(Boolean) as Array<{ at: string; message: string }>;

  if (events.length === 0) {
    return (
      <PanelPlaceholder
        title="No activity yet"
        body="Server events will appear here as setup progresses."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li
          key={event.at + event.message}
          className="rounded-xl border border-white/10 bg-felt-800/40 px-5 py-4"
        >
          <p className="text-sm text-white">{event.message}</p>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(event.at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SettingsPanel({
  server,
  onLabelUpdated,
}: {
  server: Server;
  onLabelUpdated: (label: string) => void;
}) {
  const statRows = getServerStatRows(server);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Server name
        </h3>
        <ServerLabelEditor
          serverId={server.id}
          label={server.label}
          fallbackLabel={`${getPlanLabel(server.plan)} server`}
          onUpdated={onLabelUpdated}
          className="mt-3"
        />
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Plan profile
        </h3>
        <p className="mt-2 text-sm text-gray-300">
          {getPlanLabel(server.plan)} — provisioning tags applied at setup:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(server.provisionTags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-felt-900/50 px-3 py-1 font-mono text-xs text-gray-300"
            >
              {tag.startsWith("sim:") ? simNameFromTag(tag) : tag}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Resource summary
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {statRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-white/5 bg-felt-900/30 px-4 py-3"
            >
              <dt className="text-xs text-gray-500">{row.label}</dt>
              <dd className={`mt-1 text-sm text-gray-200 ${row.mono ? "font-mono" : ""}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function TerminalPanel({ server }: { server: Server }) {
  if (isServerSettingUp(server)) {
    return (
      <PanelPlaceholder
        title="Terminal not available yet"
        body="Command-line access will unlock after your server finishes setup."
      />
    );
  }

  return (
    <PanelPlaceholder
      title="Browser terminal"
      body="Secure in-browser PowerShell access is coming soon. You'll run admin tasks without leaving PokerProbe."
    />
  );
}

function ServerManageView({
  server,
  onLabelUpdated,
  onServerUpdated,
  onServerTerminated,
}: {
  server: Server;
  onLabelUpdated: (label: string) => void;
  onServerUpdated: (patch: Partial<Server>) => void;
  onServerTerminated: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ManageTab>("desktop");
  const displayStatus = getServerDisplayStatus(server);
  const fallbackLabel = `${getPlanLabel(server.plan)} server`;
  const canManage = useCanAccessServerManage(server);
  const previewMode = useDevToolsPreviewMode(server);
  const effectiveOnline = useEffectiveServerOnline(server);
  const statusColor = getServerStatusLightColor(server, { effectiveOnline });
  const statusLabel = getServerStatusLabel(server, { previewMode, effectiveOnline });

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link href="/dashboard" className="text-sm text-gold-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-6 font-display text-2xl font-bold text-white">
          {server.label || fallbackLabel}
        </h1>
        <p className="mt-4 text-gray-400">
          Server management unlocks when setup is complete and your server status
          is Online.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Current status: {displayStatus.label}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {previewMode && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Preview mode — you can explore this page before your server is Online.
          Live desktop and file access will activate when setup completes.
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            {server.label || fallbackLabel}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {getServerAddress(server)} ·{" "}
            <span className="inline-flex items-center gap-1.5 text-gray-300">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  statusColor === "green" ? "bg-green-500" : "bg-red-500"
                }`}
                aria-hidden="true"
              />
              {statusLabel}
            </span>
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400">
          {getPlanLabel(server.plan)} plan
        </span>
      </div>

      <nav
        className="mt-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-px"
        aria-label="Server sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border border-b-0 border-white/10 bg-felt-800/60 text-gold-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="rounded-b-xl rounded-tr-xl border border-white/10 bg-felt-800/40 p-6 sm:p-8">
        {activeTab === "desktop" && <DesktopPanel server={server} />}
        {activeTab === "sims" && <SimsPanel server={server} />}
        {activeTab === "files" && <FilesPanel server={server} />}
        {activeTab === "activity" && <ActivityPanel server={server} />}
        {activeTab === "settings" && (
          <SettingsPanel server={server} onLabelUpdated={onLabelUpdated} />
        )}
        {activeTab === "plan" && (
          <PlanPanel
            server={server}
            onServerUpdated={onServerUpdated}
            onServerTerminated={onServerTerminated}
          />
        )}
        {activeTab === "terminal" && <TerminalPanel server={server} />}
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
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

export function ServerManageClient({ serverId }: { serverId: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearServer = useCallback(() => {
    setServer(null);
    setError(null);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    if (!user?.uid) {
      clearServer();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setServer(await fetchServer(serverId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load server");
      setServer(null);
    } finally {
      setLoading(false);
    }
  }, [serverId, user?.uid, clearServer]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      clearServer();
      router.replace(`/signin?callbackUrl=/dashboard/servers/${serverId}`);
    }
  }, [authLoading, user, router, serverId, clearServer]);

  useEffect(() => {
    if (!user?.uid) {
      clearServer();
      return;
    }
    void load();
  }, [user?.uid, load, clearServer]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center gap-3 px-4 py-16 text-gray-400 sm:px-6">
        <Spinner />
        {authLoading ? "Loading…" : "Redirecting…"}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-16 text-gray-400 sm:px-6">
        <Spinner />
        Loading server…
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-red-300">{error ?? "Server not found"}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-gold-400 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const onServerUpdated = useCallback((patch: Partial<Server>) => {
    setServer((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const onServerTerminated = useCallback(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <ServerManageView
      server={server}
      onLabelUpdated={(label) =>
        setServer((current) => (current ? { ...current, label } : current))
      }
      onServerUpdated={onServerUpdated}
      onServerTerminated={onServerTerminated}
    />
  );
}
