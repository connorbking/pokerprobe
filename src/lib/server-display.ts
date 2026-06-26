import type { PlanId, Server } from "@/lib/firestore-server";
import { resolveServerFqdn } from "@/lib/server-hostname";

export interface PlanResourceSpec {
  vcpu: number;
  ramGb: number;
  storageGb: number;
}

const PLAN_SPECS: Record<PlanId, PlanResourceSpec> = {
  starter: { vcpu: 8, ramGb: 32, storageGb: 240 },
  pro: { vcpu: 16, ramGb: 64, storageGb: 360 },
  elite: { vcpu: 32, ramGb: 128, storageGb: 600 },
  baremetal: { vcpu: 32, ramGb: 128, storageGb: 600 },
};

export function getPlanResourceSpec(plan: PlanId): PlanResourceSpec {
  return PLAN_SPECS[plan];
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

/** Host for Microsoft Remote Desktop (FQDN preferred, else public IP). */
export function getRdpHost(server: Pick<Server, "hostname" | "serverSlug" | "userSlug" | "ip" | "status">): string | null {
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
}

export function getServerStatRows(server: Server): ServerStatRow[] {
  const pending = isServerSettingUp(server);
  const spec = getPlanResourceSpec(server.plan);

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
      label: "Storage",
      value: formatUsagePair(server.storageUsedGb, spec.storageGb, "GB", pending),
    },
    {
      label: "CPU",
      value: cpuValue,
    },
    {
      label: "CPU load",
      value: pending || server.cpuUsedPercent == null
        ? "--"
        : `${server.cpuUsedPercent}%`,
    },
  ];
}
