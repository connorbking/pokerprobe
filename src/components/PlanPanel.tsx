"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Server } from "@/lib/firestore-server";
import { getPlanById } from "@/lib/config";
import { getPlanLabel } from "@/lib/servers";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAdminImmediateCancelEnabled } from "@/lib/dev-tools-hooks";

interface SubscriptionBilling {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

async function authFetch(url: string, init?: RequestInit) {
  const auth = getFirebaseAuth();
  const headers: HeadersInit = { ...(init?.headers ?? {}) };
  if (auth?.currentUser) {
    (headers as Record<string, string>).Authorization =
      `Bearer ${await auth.currentUser.getIdToken()}`;
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PlanPanel({
  server,
  onServerUpdated,
  onServerTerminated,
}: {
  server: Server;
  onServerUpdated: (patch: Partial<Server>) => void;
  onServerTerminated: () => void;
}) {
  const plan = getPlanById(server.plan);
  const showImmediateCancel = useAdminImmediateCancelEnabled();

  const [billing, setBilling] = useState<SubscriptionBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelingNow, setCancelingNow] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmImmediate, setConfirmImmediate] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    if (server.status === "terminated") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/servers/${server.id}/subscription`);
      const data = (await res.json()) as {
        billing?: SubscriptionBilling;
        error?: string;
      };
      if (!res.ok || !data.billing) {
        throw new Error(data.error ?? "Failed to load subscription");
      }
      setBilling(data.billing);
      onServerUpdated({
        cancelAtPeriodEnd: data.billing.cancelAtPeriodEnd,
        currentPeriodEnd: data.billing.currentPeriodEnd,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [server.id, server.status, onServerUpdated]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  async function handleCancelAtPeriodEnd() {
    setCanceling(true);
    setActionMessage(null);
    setError(null);
    try {
      const res = await authFetch(`/api/servers/${server.id}/subscription`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        billing?: SubscriptionBilling;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Cancel failed");
      }
      if (data.billing) setBilling(data.billing);
      setActionMessage(
        data.message ??
          "Subscription canceled. Access continues until the end of your billing period."
      );
      onServerUpdated({
        cancelAtPeriodEnd: true,
        currentPeriodEnd: data.billing?.currentPeriodEnd ?? null,
      });
      setConfirmEnd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCanceling(false);
    }
  }

  async function handleCancelImmediately() {
    setCancelingNow(true);
    setActionMessage(null);
    setError(null);
    try {
      const res = await authFetch(`/api/servers/${server.id}/subscription`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Immediate cancel failed");
      }
      setActionMessage(data.message ?? "Server removed immediately.");
      setConfirmImmediate(false);
      onServerTerminated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Immediate cancel failed");
    } finally {
      setCancelingNow(false);
    }
  }

  if (server.status === "terminated") {
    return (
      <div className="rounded-xl border border-white/10 bg-felt-900/30 px-6 py-8">
        <p className="font-medium text-white">Subscription ended</p>
        <p className="mt-2 text-sm text-gray-400">
          This server was removed from your account
          {server.canceledAt ? ` on ${formatDate(server.canceledAt)}` : ""}.
        </p>
        <Link
          href="/dashboard/plans"
          className="mt-6 inline-flex rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-felt-950 hover:bg-gold-400"
        >
          View plans
        </Link>
      </div>
    );
  }

  const cancelPending =
    billing?.cancelAtPeriodEnd || server.cancelAtPeriodEnd === true;
  const accessUntil =
    billing?.currentPeriodEnd ?? server.currentPeriodEnd ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/10 bg-felt-900/30 p-6">
        <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Current plan
        </h3>
        <p className="mt-2 font-display text-2xl font-bold text-white">
          {getPlanLabel(server.plan)}
        </p>
        {plan && (
          <p className="mt-1 text-sm text-gray-400">
            ${plan.price}/month · {plan.description}
          </p>
        )}
        {loading && (
          <p className="mt-4 text-sm text-gray-500">Loading billing status…</p>
        )}
        {!loading && billing && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">
                Subscription status
              </dt>
              <dd className="mt-1 text-sm capitalize text-gray-200">
                {billing.status.replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">
                {cancelPending ? "Access until" : "Next renewal"}
              </dt>
              <dd className="mt-1 text-sm text-gray-200">
                {formatDate(accessUntil)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {cancelPending && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100">
          Your subscription is set to cancel on{" "}
          <strong>{formatDate(accessUntil)}</strong>. You keep full access until
          then; it will not renew automatically.
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-100">
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!cancelPending && (
        <section className="rounded-xl border border-white/10 bg-felt-800/40 p-6">
          <h3 className="text-sm font-medium text-white">Cancel subscription</h3>
          <p className="mt-2 max-w-xl text-sm text-gray-400">
            Cancel anytime. You&apos;ll keep access for the rest of your current
            billing period; we won&apos;t charge you again after{" "}
            {formatDate(accessUntil)}.
          </p>

          {!confirmEnd ? (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="mt-5 rounded-lg border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="mt-5 space-y-3 rounded-lg border border-red-500/20 bg-red-950/20 p-4">
              <p className="text-sm text-red-100">
                Confirm cancel at period end? Your server stays online until{" "}
                {formatDate(accessUntil)}.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={canceling}
                  onClick={() => void handleCancelAtPeriodEnd()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {canceling ? "Canceling…" : "Yes, cancel renewal"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
                >
                  Keep subscription
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {showImmediateCancel && (
        <section className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-6">
          <h3 className="text-sm font-medium text-orange-200">
            Admin · immediate cancel
          </h3>
          <p className="mt-2 max-w-xl text-sm text-orange-100/80">
            Dev tools enabled. Cancels the Stripe subscription now, deletes the
            Cloudflare subdomain, and removes this server from the user&apos;s
            account immediately.
          </p>

          {!confirmImmediate ? (
            <button
              type="button"
              onClick={() => setConfirmImmediate(true)}
              className="mt-5 rounded-lg border border-orange-500/50 px-5 py-2.5 text-sm font-medium text-orange-200 hover:bg-orange-500/10"
            >
              Cancel immediately (admin)
            </button>
          ) : (
            <div className="mt-5 space-y-3 rounded-lg border border-orange-500/30 bg-black/20 p-4">
              <p className="text-sm text-orange-100">
                This cannot be undone. Cancel Stripe and remove server now?
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={cancelingNow}
                  onClick={() => void handleCancelImmediately()}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
                >
                  {cancelingNow ? "Removing…" : "Yes, cancel immediately"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmImmediate(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
