"use client";

import { useEffect, useMemo, useState } from "react";
import type { Server } from "@/lib/firestore-server";
import {
  formatVaultLimitGb,
  getIncludedVaultLabel,
  getStorageVaultTierByPriceId,
  getUpgradeableVaultTiers,
  resolveStorageLimitGb,
  type StorageVaultTier,
} from "@/lib/storage-vault";
import { getFirebaseAuth } from "@/lib/firebase/client";

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400"
      aria-hidden="true"
    />
  );
}

export function StorageVaultUpgradeModal({
  server,
  open,
  onClose,
  onUpgraded,
  onUpgradeStart,
}: {
  server: Server;
  open: boolean;
  onClose: () => void;
  onUpgraded: (result: { storageLimitGB: number; stripeStoragePriceId: string }) => void;
  onUpgradeStart?: () => void;
}) {
  const currentLimitGb = resolveStorageLimitGb(server.plan, {
    storageLimitGB: server.storageLimitGB,
    stripeStoragePriceId: server.stripeStoragePriceId,
  });
  const paidTier = server.stripeStoragePriceId
    ? getStorageVaultTierByPriceId(server.stripeStoragePriceId)
    : undefined;
  const currentVaultLabel =
    paidTier != null
      ? paidTier.name
      : getIncludedVaultLabel(server.plan);
  const tiers = useMemo(
    () => getUpgradeableVaultTiers(currentLimitGb),
    [currentLimitGb]
  );
  const [selected, setSelected] = useState<StorageVaultTier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelected(tiers.find((t) => t.highlighted) ?? tiers[0] ?? null);
  }, [open, tiers]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    onUpgradeStart?.();

    try {
      const auth = getFirebaseAuth();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `/api/servers/${server.id}/storage/upgrade`,
        {
          method: "POST",
          headers,
          credentials: "same-origin",
          body: JSON.stringify({ newStoragePriceId: selected.stripePriceId }),
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        storageLimitGB?: number;
        stripeStoragePriceId?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Upgrade failed");
      }

      onUpgraded({
        storageLimitGB: data.storageLimitGB ?? selected.limitGB,
        stripeStoragePriceId:
          data.stripeStoragePriceId ?? selected.stripePriceId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-upgrade-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close vault upgrade"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-white/10 bg-felt-900 shadow-2xl sm:rounded-xl">
        <div className="sticky top-0 border-b border-white/10 bg-felt-900/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gold-400">
                Permanent cloud vault
              </p>
              <h2
                id="vault-upgrade-title"
                className="mt-1 text-lg font-semibold text-white"
              >
                Upgrade vault storage
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Local SSD on your server holds active solver work. Permanent
                hard-drive space is a separate vault add-on — upgrade below.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-2 py-1 text-sm text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-lg border border-white/10 bg-felt-800/40 px-4 py-3 text-sm">
            <p className="text-gray-400">Current vault</p>
            <p className="mt-1 font-medium text-white">
              {currentVaultLabel} · {formatVaultLimitGb(currentLimitGb)}
            </p>
          </div>

          {tiers.length === 0 ? (
            <p className="text-sm text-gray-400">
              You&apos;re on the highest vault tier available.
            </p>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier) => {
                const isSelected = selected?.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelected(tier)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                      isSelected
                        ? "border-gold-400/50 bg-gold-400/10"
                        : "border-white/10 bg-felt-800/30 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{tier.name}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {tier.tagline}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {tier.limitGB >= 1024
                            ? `${Math.round(tier.limitGB / 1024)} TB permanent vault`
                            : `${tier.limitGB} GB permanent vault`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gold-400">
                          ${tier.priceMonthlyUsd}
                          <span className="text-sm font-normal text-gray-400">
                            /mo
                          </span>
                        </p>
                        {tier.highlighted && (
                          <span className="mt-1 inline-block rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-400">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Prorated charges apply immediately. Your subscription updates in
            place — no new checkout required.
          </p>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-white/10 bg-felt-900/95 px-5 py-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || submitting || tiers.length === 0}
            onClick={() => void handleConfirm()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-felt-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner />
                Upgrading…
              </>
            ) : (
              "Confirm upgrade"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
