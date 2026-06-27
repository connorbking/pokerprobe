"use client";

import Link from "next/link";
import { useState } from "react";
import type { Server } from "@/lib/firestore-server";
import { siteConfig } from "@/lib/config";
import {
  getPlanLabel,
  getPlanLabelWithTier,
  getServerStatusLabel,
  getServerStatusLightColor,
} from "@/lib/servers";
import {
  getServerStatRows,
  isServerSettingUp,
} from "@/lib/server-display";
import { ServerLabelEditor } from "@/components/ServerLabelEditor";
import { StorageVaultUpgradeModal } from "@/components/StorageVaultUpgradeModal";
import {
  useCanAccessServerManage,
  useDevToolsPreviewMode,
  useEffectiveServerOnline,
} from "@/lib/dev-tools-hooks";
import { useDevTools } from "@/context/DevToolsContext";

function StatusDot({ color }: { color: "green" | "red" }) {
  const colors = {
    green: "bg-green-500",
    red: "bg-red-500",
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      {color === "green" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colors.green}`}
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
  onStorageUpgraded,
  onStorageUpgradeStart,
  storageUpgrading = false,
}: {
  server: Server;
  onManageBilling: () => void;
  onLabelUpdated: (serverId: string, label: string) => void;
  onStorageUpgraded?: (
    serverId: string,
    result: { storageLimitGB: number; stripeStoragePriceId: string }
  ) => void;
  onStorageUpgradeStart?: (serverId: string) => void;
  storageUpgrading?: boolean;
}) {
  const { toggles, devToolsActive, isAdmin } = useDevTools();
  const fallbackLabel = `${getPlanLabel(server.plan)} server`;
  const isSettingUp = isServerSettingUp(server);
  const statRows = getServerStatRows(server);
  const canManage = useCanAccessServerManage(server);
  const previewMode = useDevToolsPreviewMode(server);
  const effectiveOnline = useEffectiveServerOnline(server);
  const statusColor = getServerStatusLightColor(server, { effectiveOnline });
  const statusLabel = getServerStatusLabel(server, { previewMode, effectiveOnline });
  const manageDisabledTitle =
    "Available when setup is complete and your server is Online";
  const showDebug =
    devToolsActive && isAdmin && toggles.showServerDebugInfo;
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const showTileOverlay = storageUpgrading;

  return (
    <>
      <div className="card-glow relative w-full rounded-xl border border-white/10 bg-felt-800/50 p-6 sm:p-8">
        {showTileOverlay && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-felt-950/70 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Spinner />
              Updating vault storage…
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <ServerLabelEditor
              serverId={server.id}
              label={server.label}
              fallbackLabel={fallbackLabel}
              onUpdated={(label) => onLabelUpdated(server.id, label)}
            />
            <div className="mt-2 flex items-center gap-2">
              <StatusDot color={statusColor} />
              <span className="text-sm text-gray-300">{statusLabel}</span>
              {isSettingUp && <Spinner />}
            </div>
          </div>
        <span className="inline-flex w-fit shrink-0 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400">
          {getPlanLabelWithTier(server.plan)}
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
              <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                <span>{row.label}</span>
                {row.tooltip && (
                  <span
                    className="cursor-help normal-case text-gray-600"
                    title={row.tooltip}
                    aria-label={row.tooltip}
                  >
                    ⓘ
                  </span>
                )}
              </dt>
              <dd
                className={`mt-1 flex items-center gap-2 text-sm text-gray-200 ${
                  row.mono ? "font-mono" : ""
                } ${
                  isSettingUp && row.label === "Server address"
                    ? "italic text-gray-400"
                    : ""
                }`}
              >
                <span>{row.value}</span>
                {row.action === "vault-upgrade" && (
                  <button
                    type="button"
                    onClick={() => setVaultModalOpen(true)}
                    disabled={showTileOverlay}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-gold-400/40 bg-gold-400/15 px-1.5 text-xs font-semibold text-gold-400 transition hover:border-gold-400/60 hover:bg-gold-400/25 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Upgrade permanent cloud vault"
                    aria-label="Upgrade vault storage"
                  >
                    +
                  </button>
                )}
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
            {server.storageLimitGB != null && (
              <p className="mt-1">vault: {server.storageLimitGB} GB</p>
            )}
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

      <StorageVaultUpgradeModal
        server={server}
        open={vaultModalOpen}
        onClose={() => setVaultModalOpen(false)}
        onUpgraded={(result) => {
          onStorageUpgraded?.(server.id, result);
        }}
        onUpgradeStart={() => onStorageUpgradeStart?.(server.id)}
      />
    </>
  );
}
