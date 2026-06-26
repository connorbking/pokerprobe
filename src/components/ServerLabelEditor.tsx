"use client";

import { useEffect, useRef, useState } from "react";
import { SERVER_LABEL_MAX_LENGTH, validateServerLabel } from "@/lib/server-label";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
    </svg>
  );
}

export function ServerLabelEditor({
  serverId,
  label,
  fallbackLabel,
  onUpdated,
  className = "",
}: {
  serverId: string;
  label: string;
  fallbackLabel: string;
  onUpdated: (label: string) => void;
  className?: string;
}) {
  const displayLabel = label || fallbackLabel;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayLabel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setDraft(displayLabel);
    }
  }, [displayLabel, editing]);

  const cancel = () => {
    setDraft(displayLabel);
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    const validationError = validateServerLabel(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { getFirebaseAuth } = await import("@/lib/firebase/client");
      const auth = getFirebaseAuth();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (auth?.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      }

      const res = await fetch(`/api/servers/${serverId}`, {
        method: "PATCH",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ label: draft }),
      });

      const data = (await res.json()) as { server?: { label: string }; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to rename server");
      }

      onUpdated(data.server?.label ?? draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename server");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className={className}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={SERVER_LABEL_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") cancel();
            }}
            className="min-w-[12rem] flex-1 rounded-lg border border-white/15 bg-felt-900/60 px-3 py-1.5 text-lg font-semibold text-white outline-none ring-gold-400/40 focus:ring-2"
            aria-label="Server name"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-semibold text-felt-950 hover:bg-gold-400 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {draft.trim().length}/{SERVER_LABEL_MAX_LENGTH} characters
        </p>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <h2 className="text-xl font-semibold text-white">{displayLabel}</h2>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-gold-400"
        aria-label="Rename server"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
