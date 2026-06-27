/**
 * Hetzner Storage Box API (api.hetzner.com/v1) — subaccount provisioning.
 * Server-side only.
 *
 * Auth: HTTP Basic (HETZNER_STORAGE_API_USERNAME/PASSWORD) when set,
 * otherwise Bearer token (HETZNER_STORAGE_API_TOKEN or HETZNER_API_TOKEN).
 */

import { randomBytes } from "node:crypto";
import {
  getUserByUid,
  updateUserHetznerStorage,
  type FirestoreUser,
  type HetznerStorageSubaccount,
} from "@/lib/firestore-server";
import { HETZNER_LABELS } from "@/lib/hetzner/config";

const STORAGE_API_BASE = "https://api.hetzner.com/v1";

export class HetznerStorageError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_CONFIGURED"
      | "API_ERROR"
      | "NOT_FOUND"
      | "PROVISION_FAILED"
  ) {
    super(message);
    this.name = "HetznerStorageError";
  }
}

interface HetznerStorageApiConfig {
  parentStorageBoxId: number;
  authHeaders: Record<string, string>;
}

interface HetznerApiErrorBody {
  error?: { message?: string; code?: string };
}

interface HetznerStorageBox {
  id: number;
  name: string;
  server: string;
  username: string;
}

interface HetznerStorageSubaccountApi {
  id: number;
  username: string;
  name: string;
  home_directory: string;
}

function getStorageApiConfig(): HetznerStorageApiConfig {
  const parentId = Number(process.env.HETZNER_PARENT_STORAGE_BOX_ID ?? "0");
  const basicUser = process.env.HETZNER_STORAGE_API_USERNAME?.trim();
  const basicPass = process.env.HETZNER_STORAGE_API_PASSWORD?.trim();

  let authHeaders: Record<string, string>;

  if (basicUser && basicPass) {
    const encoded = Buffer.from(`${basicUser}:${basicPass}`, "utf8").toString(
      "base64"
    );
    authHeaders = { Authorization: `Basic ${encoded}` };
  } else {
    const token =
      process.env.HETZNER_STORAGE_API_TOKEN?.trim() ??
      process.env.HETZNER_API_TOKEN?.trim() ??
      "";
    if (!token) {
      throw new HetznerStorageError(
        "Configure HETZNER_STORAGE_API_USERNAME/PASSWORD or HETZNER_STORAGE_API_TOKEN",
        "NOT_CONFIGURED"
      );
    }
    authHeaders = { Authorization: `Bearer ${token}` };
  }

  if (!parentId) {
    throw new HetznerStorageError(
      "HETZNER_PARENT_STORAGE_BOX_ID must be configured",
      "NOT_CONFIGURED"
    );
  }

  return { parentStorageBoxId: parentId, authHeaders };
}

async function hetznerStorageApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { authHeaders } = getStorageApiConfig();

  const res = await fetch(`${STORAGE_API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as T & HetznerApiErrorBody;

  if (!res.ok) {
    throw new HetznerStorageError(
      body.error?.message ?? `Hetzner Storage API ${res.status} on ${path}`,
      "API_ERROR"
    );
  }

  return body;
}

export function buildStorageHostUrl(host: string): string {
  const trimmed = host.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("sftp://")) {
    return trimmed;
  }
  return `sftp://${trimmed}`;
}

function generateSubaccountPassword(): string {
  return randomBytes(24).toString("base64url");
}

function sanitizeHomeDirectory(userId: string): string {
  const slug = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase();
  return `/pp-${slug || "user"}/`;
}

async function getParentStorageBox(): Promise<HetznerStorageBox> {
  const { parentStorageBoxId } = getStorageApiConfig();
  const response = await hetznerStorageApi<{ storage_box: HetznerStorageBox }>(
    `/storage_boxes/${parentStorageBoxId}`
  );
  return response.storage_box;
}

export async function createStorageSubaccount(input: {
  userId: string;
  name?: string;
  homeDirectory?: string;
  password?: string;
}): Promise<HetznerStorageSubaccount> {
  const { parentStorageBoxId } = getStorageApiConfig();
  const parent = await getParentStorageBox();
  const password = input.password ?? generateSubaccountPassword();
  const homeDirectory = input.homeDirectory ?? sanitizeHomeDirectory(input.userId);
  const name = input.name ?? `pp-${input.userId.slice(0, 12)}`;

  const response = await hetznerStorageApi<{
    subaccount: HetznerStorageSubaccountApi;
  }>(`/storage_boxes/${parentStorageBoxId}/subaccounts`, {
    method: "POST",
    body: JSON.stringify({
      name,
      home_directory: homeDirectory,
      password,
      labels: {
        [HETZNER_LABELS.app]: "pokerprobe",
        [HETZNER_LABELS.pokerprobeUserId]: input.userId,
      },
      access_settings: {
        readonly: false,
        ssh_enabled: true,
        samba_enabled: false,
        webdav_enabled: true,
        reachable_externally: true,
      },
    }),
  });

  const sub = response.subaccount;

  return {
    subaccountId: sub.id,
    username: sub.username,
    password,
    host: parent.server,
    hostUrl: buildStorageHostUrl(parent.server),
    homeDirectory: sub.home_directory,
    parentStorageBoxId,
    provisionedAt: new Date().toISOString(),
  };
}

export async function deleteStorageSubaccount(
  subaccountId: number
): Promise<void> {
  const { parentStorageBoxId } = getStorageApiConfig();
  await hetznerStorageApi(
    `/storage_boxes/${parentStorageBoxId}/subaccounts/${subaccountId}`,
    { method: "DELETE" }
  );
}

/** Return stored credentials or create a new Storage Box subaccount and persist to users/{uid}. */
export async function ensureUserStorageSubaccount(
  userId: string
): Promise<HetznerStorageSubaccount> {
  const user = await getUserByUid(userId);
  if (!user) {
    throw new HetznerStorageError(`User not found: ${userId}`, "NOT_FOUND");
  }

  if (user.hetznerStorage?.username && user.hetznerStorage.host) {
    return user.hetznerStorage;
  }

  const credentials = await createStorageSubaccount({ userId });
  await updateUserHetznerStorage(userId, credentials);
  return credentials;
}

export function getUserStorageSubaccount(
  user: Pick<FirestoreUser, "hetznerStorage">
): HetznerStorageSubaccount {
  if (!user.hetznerStorage?.username || !user.hetznerStorage.host) {
    throw new HetznerStorageError(
      "User has no Storage Box subaccount provisioned",
      "NOT_FOUND"
    );
  }
  return user.hetznerStorage;
}

export async function clearUserStorageSubaccount(userId: string): Promise<void> {
  const user = await getUserByUid(userId);
  if (!user?.hetznerStorage?.subaccountId) {
    return;
  }

  try {
    await deleteStorageSubaccount(user.hetznerStorage.subaccountId);
  } catch (err) {
    console.error(`[HETZNER STORAGE] Failed to delete subaccount for ${userId}:`, err);
  }

  await updateUserHetznerStorage(userId, null);
}
