"use client";

import Link from "next/link";
import type { Server } from "@/lib/firestore-server";
import { siteConfig } from "@/lib/config";
import {
  getPlanLabel,
  getServerDisplayStatus,
} from "@/lib/servers";
import {
  getServerStatRows,
  isServerSettingUp,
} from "@/lib/server-display";
import { ServerLabelEditor } from "@/components/ServerLabelEditor";
import {
  useCanAccessServerManage,
  useDevToolsPreviewMode,
  useEffectiveServerOnline,
} from "@/lib/dev-tools-hooks";
import { useDevTools } from "@/context/DevToolsContext";

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

export function ServerTile({
  server,
  onManageBilling,
  onLabelUpdated,
}: {
  server: Server;
  onManageBilling: () => void;
  onLabelUpdated: (serverId: string, label: string) => void;
}) {
  const { toggles, devToolsActive, isAdmin } = useDevTools();
  const displayStatus = getServerDisplayStatus(server);
  const fallbackLabel = `${getPlanLabel(server.plan)} server`;
  const isSettingUp = isServerSettingUp(server);
  const statRows = getServerStatRows(server);
  const canManage = useCanAccessServerManage(server);
  const previewMode = useDevToolsPreviewMode(server);
  const effectiveOnline = useEffectiveServerOnline(server);
  const manageDisabledTitle =
    "Available when setup is complete and your server is Online";
  const showDebug =
    devToolsActive && isAdmin && toggles.showServerDebugInfo;

  return (
    <div className="card-glow w-full rounded-xl border border-white/10 bg-felt-800/50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <ServerLabelEditor
            serverId={server.id}
            label={server.label}
            fallbackLabel={fallbackLabel}
            onUpdated={(label) => onLabelUpdated(server.id, label)}
          />
          <div className="mt-2 flex items-center gap-2">
            <StatusDot color={displayStatus.color} />
            <span className="text-sm text-gray-300">
              {previewMode ? "Online (mocked)" : displayStatus.label}
            </span>
            {isSettingUp && <Spinner />}
          </div>
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400">
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

      <dl className="mt-6 grid gap-4 border-t border-white/5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {statRows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              {row.label}
            </dt>
            <dd
              className={`mt-1 text-sm text-gray-200 ${row.mono ? "font-mono" : ""} ${
                isSettingUp && row.label === "Server address"
                  ? "italic text-gray-400"
                  : ""
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {showDebug && (
        <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3 font-mono text-xs text-purple-200">
          <p>serverId: {server.id}</p>
          {server.provisionTags?.length ? (
            <p className="mt-1">tags: {server.provisionTags.join(", ")}</p>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {canManage || previewMode ? (
          <Link
            href={`/dashboard/servers/${server.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-felt-950 transition hover:bg-gold-400"
          >
            Manage server
          </Link>
        ) : (
          <span
            title={manageDisabledTitle}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-gray-500"
            aria-disabled="true"
          >
            Manage server
          </span>
        )}
        {(effectiveOnline || previewMode) && server.guacamoleUrl && (
          <a
            href={server.guacamoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:border-white/20 hover:text-white"
          >
            Quick connect
          </a>
        )}
      </div>
    </div>
  );
}
