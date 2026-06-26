import { firestoreGet, firestoreSet, getAccessToken } from "@/lib/firestore";
import { getFirestoreConfig } from "@/lib/firestore-env";
import { getProvisionConfig } from "@/lib/provision-config";
import type { Server } from "@/lib/firestore-server";

/** Lab fallback when Firestore config is missing and env is unset */
export const LAB_FALLBACK_ORIGIN_IP = "173.70.205.120";
export const LAB_FALLBACK_ORIGIN_PORT = 8787;

const CONFIG_DOC_PATH = "config/provisioning";

export interface ProvisioningDefaults {
  defaultOriginIp: string;
  defaultOriginPort: number | null;
  updatedAt: string;
}

export interface ServerOrigin {
  ip: string;
  originPort: number | null;
}

async function getToken(): Promise<{ projectId: string; token: string }> {
  const { projectId, serviceAccountJson } = getFirestoreConfig();
  const token = await getAccessToken(serviceAccountJson);
  return { projectId, token };
}

function parsePort(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function envOriginFallback(): ServerOrigin {
  const { originIp, originPort } = getProvisionConfig();
  return {
    ip: originIp ?? LAB_FALLBACK_ORIGIN_IP,
    originPort: originPort ?? LAB_FALLBACK_ORIGIN_PORT,
  };
}

function docToDefaults(data: Record<string, unknown>): ProvisioningDefaults {
  return {
    defaultOriginIp: String(data.defaultOriginIp ?? LAB_FALLBACK_ORIGIN_IP),
    defaultOriginPort: parsePort(data.defaultOriginPort) ?? LAB_FALLBACK_ORIGIN_PORT,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

/** Platform default origin — stored in Firestore `config/provisioning`. */
export async function getProvisioningDefaults(): Promise<ProvisioningDefaults> {
  const { projectId, token } = await getToken();
  const doc = await firestoreGet(projectId, CONFIG_DOC_PATH, token);

  if (doc) {
    return docToDefaults(doc);
  }

  const fallback = envOriginFallback();
  const defaults: ProvisioningDefaults = {
    defaultOriginIp: fallback.ip,
    defaultOriginPort: fallback.originPort,
    updatedAt: new Date().toISOString(),
  };

  await firestoreSet(
    projectId,
    CONFIG_DOC_PATH,
    defaults as unknown as Record<string, unknown>,
    token
  );

  return defaults;
}

export async function setProvisioningDefaults(
  patch: Partial<Pick<ProvisioningDefaults, "defaultOriginIp" | "defaultOriginPort">>
): Promise<ProvisioningDefaults> {
  const current = await getProvisioningDefaults();
  const next: ProvisioningDefaults = {
    defaultOriginIp: patch.defaultOriginIp ?? current.defaultOriginIp,
    defaultOriginPort:
      patch.defaultOriginPort !== undefined
        ? patch.defaultOriginPort
        : current.defaultOriginPort,
    updatedAt: new Date().toISOString(),
  };

  const { projectId, token } = await getToken();
  await firestoreSet(
    projectId,
    CONFIG_DOC_PATH,
    next as unknown as Record<string, unknown>,
    token
  );

  return next;
}

/** Per-server origin: record fields first, then platform defaults (Hetzner IP replaces later). */
export async function resolveServerOrigin(
  server: Pick<Server, "ip" | "originPort">
): Promise<ServerOrigin> {
  if (server.ip) {
    return {
      ip: server.ip,
      originPort: server.originPort ?? null,
    };
  }

  const defaults = await getProvisioningDefaults();
  return {
    ip: defaults.defaultOriginIp,
    originPort: defaults.defaultOriginPort,
  };
}
