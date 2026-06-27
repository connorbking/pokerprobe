/**
 * Hetzner Cloud API client (api.hetzner.cloud/v1) — bearer token auth.
 * Server-side only.
 */

import { HETZNER_LABELS, pokerprobeServerLabels } from "@/lib/hetzner/config";

export class HetznerComputeError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_CONFIGURED" | "API_ERROR" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "HetznerComputeError";
  }
}

export interface HetznerComputeConfig {
  apiToken: string;
  snapshotId: number;
  location: string;
}

export interface HetznerCloudServer {
  id: number;
  name: string;
  status: string;
  labels: Record<string, string>;
  public_net: { ipv4: { ip: string } | null };
}

export interface CreateHetznerServerInput {
  name: string;
  serverType: string;
  userId: string;
  serverId: string;
  userData: string;
  extraLabels?: Record<string, string>;
}

export function getHetznerComputeConfig(): HetznerComputeConfig {
  const apiToken = process.env.HETZNER_API_TOKEN?.trim() ?? "";
  const snapshotId = Number(process.env.HETZNER_SNAPSHOT_ID ?? "0");
  const location = process.env.HETZNER_LOCATION?.trim() || "ash";

  if (!apiToken || !snapshotId) {
    throw new HetznerComputeError(
      "HETZNER_API_TOKEN and HETZNER_SNAPSHOT_ID must be configured",
      "NOT_CONFIGURED"
    );
  }

  return { apiToken, snapshotId, location };
}

interface HetznerApiErrorBody {
  error?: { message?: string; code?: string };
}

export async function hetznerCloudApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { apiToken } = getHetznerComputeConfig();

  const res = await fetch(`https://api.hetzner.cloud/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as T & HetznerApiErrorBody;

  if (!res.ok) {
    throw new HetznerComputeError(
      body.error?.message ?? `Hetzner Cloud API ${res.status} on ${path}`,
      "API_ERROR"
    );
  }

  return body;
}

export async function createHetznerServer(
  input: CreateHetznerServerInput
): Promise<HetznerCloudServer> {
  const config = getHetznerComputeConfig();

  const response = await hetznerCloudApi<{ server: HetznerCloudServer }>(
    "/servers",
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        server_type: input.serverType,
        location: config.location,
        image: config.snapshotId,
        user_data: input.userData,
        labels: pokerprobeServerLabels({
          userId: input.userId,
          serverId: input.serverId,
          extra: input.extraLabels,
        }),
        start_after_create: true,
      }),
    }
  );

  return response.server;
}

export async function deleteHetznerServer(serverId: string | number): Promise<void> {
  await hetznerCloudApi(`/servers/${serverId}`, { method: "DELETE" });
}

export async function getHetznerServer(
  serverId: string | number
): Promise<HetznerCloudServer | null> {
  try {
    const response = await hetznerCloudApi<{ server: HetznerCloudServer }>(
      `/servers/${serverId}`
    );
    return response.server;
  } catch (err) {
    if (err instanceof HetznerComputeError && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
}

/** List all cloud servers tagged with pokerprobe_user_id (for cron sweeps). */
export async function listHetznerServersForUser(
  userId: string
): Promise<HetznerCloudServer[]> {
  const labelSelector = `${HETZNER_LABELS.pokerprobeUserId}=${userId}`;
  const servers: HetznerCloudServer[] = [];
  let page = 1;

  while (true) {
    const response = await hetznerCloudApi<{
      servers: HetznerCloudServer[];
      meta?: { pagination?: { next_page?: number | null } };
    }>(`/servers?label_selector=${encodeURIComponent(labelSelector)}&page=${page}&per_page=50`);

    servers.push(...response.servers);
    const nextPage = response.meta?.pagination?.next_page;
    if (!nextPage) break;
    page = nextPage;
  }

  return servers;
}

/** Delete every Hetzner VM owned by a user (subscription cancellation / sweep). */
export async function deleteAllHetznerServersForUser(userId: string): Promise<number> {
  const servers = await listHetznerServersForUser(userId);
  let deleted = 0;

  for (const server of servers) {
    await deleteHetznerServer(server.id);
    deleted += 1;
  }

  return deleted;
}
