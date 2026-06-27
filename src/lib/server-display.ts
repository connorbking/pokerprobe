import type { PlanId, Server } from "@/lib/firestore-server";
import { getPlanById, normalizePlanId } from "@/lib/plans";
import { resolveServerFqdn } from "@/lib/server-hostname";
import { resolveStorageLimitGb } from "@/lib/storage-vault";

export interface PlanResourceSpec {
  vcpu: number;
  ramGb: number;
  /** Local NVMe on the OVH instance — ephemeral solver cache */
  solverCacheGb: number;
}

const LEGACY_PLAN_SPECS: Record<string, PlanResourceSpec> = {
  starter: { vcpu: 4, ramGb: 16, solverCacheGb: 100 },
  pro: { vcpu: 8, ramGb: 32, solverCacheGb: 200 },
  elite: { vcpu: 16, ramGb: 64, solverCacheGb: 400 },
  enterprise: { vcpu: 32, ramGb: 128, solverCacheGb: 800 },
  baremetal: { vcpu: 64, ramGb: 256, solverCacheGb: 1600 },
};

export function getPlanResourceSpec(plan: PlanId | string): PlanResourceSpec {
  if (LEGACY_PLAN_SPECS[plan]) {
    return LEGACY_PLAN_SPECS[plan]!;
  }

  const normalized = normalizePlanId(plan);
  const definition = normalized ? getPlanById(normalized) : null;
  if (definition && !definition.customBuild) {
    return {
      vcpu: definition.vcpu,
      ramGb: definition.ramGb,
      solverCacheGb: definition.solverCacheGb,
    };
  }

  return { vcpu: 4, ramGb: 16, solverCacheGb: 100 };
}

export function getServerResourceSpec(
  server: Pick<Server, "plan" | "customBuild">
): PlanResourceSpec {
  if (server.customBuild) {
    return {
      vcpu: server.customBuild.vcpu,
      ramGb: server.customBuild.ramGb,
      solverCacheGb: server.customBuild.solverCacheGb,
    };
  }
  return getPlanResourceSpec(server.plan);
}

export function isServerSettingUp(server: Pick<Server, "status">): boolean {
  return server.status === "pending" || server.status === "provisioning";
}

export function getServerAddress(server: Server): string {
  const fqdn = resolveServerFqdn(server.hostname, server.serverSlug, server.userSlug);
  if (fqdn) {
    return fqdn;
  }

  if (isServerSettingUp(server)) {
    return "Assigning subdomain";
  }

  return "Assigning subdomain";
}

export function getRdpHost(
  server: Pick<Server, "hostname" | "serverSlug" | "userSlug" | "ip" | "status">
): string | null {
  const fqdn = resolveServerFqdn(server.hostname, server.serverSlug, server.userSlug);
  if (fqdn) {
    return fqdn;
  }
  if (server.ip) {
    return server.ip;
  }
  return null;
}

export function formatUptime(server: Server): string {
  if (isServerSettingUp(server)) {
    return "--";
  }

  if (server.uptimeSeconds != null && server.uptimeSeconds >= 0) {
    return formatDuration(server.uptimeSeconds);
  }

  if (server.provisionedAt) {
    const started = new Date(server.provisionedAt).getTime();
    const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    return formatDuration(seconds);
  }

  return "--";
}

function formatDuration(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatUsagePair(
  used: number | null | undefined,
  total: number | null | undefined,
  unit: string,
  pending: boolean
): string {
  if (pending || total == null) {
    return `-- / -- ${unit}`;
  }
  if (used == null) {
    return `-- / ${total} ${unit}`;
  }
  return `${used} / ${total} ${unit}`;
}

export interface ServerStatRow {
  label: string;
  value: string;
  mono?: boolean;
  tooltip?: string;
  action?: "vault-upgrade";
}

export function getServerStatRows(server: Server): ServerStatRow[] {
  const pending = isServerSettingUp(server);
  const spec = getServerResourceSpec(server);

  const cpuValue = pending
    ? "-- / -- vCPU"
    : server.activeVcpus != null
      ? `${server.activeVcpus} / ${spec.vcpu} vCPU`
      : server.cpuUsedPercent != null
        ? `${server.cpuUsedPercent}% (${spec.vcpu} vCPU)`
        : `-- / ${spec.vcpu} vCPU`;

  return [
    {
      label: "Server address",
      value: getServerAddress(server),
      mono: true,
    },
    {
      label: "Uptime",
      value: formatUptime(server),
    },
    {
      label: "Memory",
      value: formatUsagePair(server.memoryUsedGb, spec.ramGb, "GB", pending),
    },
    {
      label: "Solver cache",
      value: formatUsagePair(
        server.storageUsedGb,
        spec.solverCacheGb,
        "GB",
        pending
      ),
      tooltip:
        "Local NVMe on your OVH instance. Ephemeral working space for active solves — syncs to your cloud vault on shutdown.",
    },
    {
      label: "Cloud vault",
      value: formatUsagePair(
        null,
        resolveStorageLimitGb(server.plan, {
          storageLimitGB: server.storageLimitGB,
          stripeStoragePriceId: server.stripeStoragePriceId,
        }),
        "GB",
        pending
      ),
      tooltip:
        "Permanent archive storage included with your plan; upgrade for more capacity.",
      action: pending ? undefined : "vault-upgrade",
    },
    {
      label: "CPU",
      value: cpuValue,
    },
    {
      label: "CPU load",
      value:
        pending || server.cpuUsedPercent == null
          ? "--"
          : `${server.cpuUsedPercent}%`,
    },
  ];
}
