import { deleteDnsRecord, upsertDnsARecord } from "@/lib/cloudflare-dns";
import { getServerById, updateServer, type Server } from "@/lib/firestore-server";
import {
  assertProvisionConfigReady,
  getProvisionConfig,
  getProvisionConfigStatus,
} from "@/lib/provision-config";
import { resolveServerOrigin } from "@/lib/provision-defaults";
import {
  buildMyrtilleDesktopUrl,
  buildServerHostPart,
} from "@/lib/server-hostname";
import { deleteHetznerServer } from "@/lib/hetzner/compute";
import { teardownUserServer } from "@/lib/hetzner/deploy";

export interface AutoProvisionInput {
  serverId: string;
  serverSlug: string;
}

export interface AutoProvisionResult {
  skipped: boolean;
  reason?: string;
  fqdn?: string;
  desktopUrl?: string;
  dnsRecordId?: string;
  activated?: boolean;
  ip?: string;
  originPort?: number | null;
}

export function isAutoProvisionEnabled(): boolean {
  return getProvisionConfigStatus().configured;
}

/** DNS + desktop URL after checkout (flat {serverSlug}.pokerprobe.com). */
export async function autoProvisionServerDesktop(
  input: AutoProvisionInput
): Promise<AutoProvisionResult> {
  const status = getProvisionConfigStatus();
  if (!status.dnsEnabled) {
    return { skipped: true, reason: "PROVISION_DNS_ENABLED is false" };
  }

  if (!status.configured) {
    return {
      skipped: true,
      reason: `Missing env: ${status.missing.join(", ")}`,
    };
  }

  const server = await getServerById(input.serverId);
  if (!server) {
    return { skipped: true, reason: `Server not found: ${input.serverId}` };
  }

  const origin = await resolveServerOrigin(server);
  if (!origin.ip) {
    return { skipped: true, reason: "No origin IP on server or in config/provisioning" };
  }

  if (!server.ip || server.originPort == null) {
    await updateServer(input.serverId, {
      ip: origin.ip,
      originPort: origin.originPort,
    });
  }

  const config = assertProvisionConfigReady();
  const hostname = buildServerHostPart(input.serverSlug);

  const dns = await upsertDnsARecord({
    token: config.cloudflareApiToken!,
    zoneId: config.cloudflareZoneId!,
    serverSlug: input.serverSlug,
    apexDomain: config.apexDomain,
    ip: origin.ip,
    proxied: config.dnsProxied,
  });

  const desktopUrl = buildMyrtilleDesktopUrl(input.serverSlug, {
    port: origin.originPort,
  });

  const patch: Partial<Server> = {
    hostname,
    ip: origin.ip,
    originPort: origin.originPort,
    guacamoleUrl: desktopUrl,
    cloudflareDnsRecordId: dns.recordId,
    notes: `DNS ${dns.created ? "created" : "updated"} ${dns.fqdn} → ${origin.ip}${
      origin.originPort ? `:${origin.originPort}` : ""
    } at ${new Date().toISOString()}`,
  };

  if (config.autoActivate) {
    patch.status = "active";
    patch.provisionedAt = new Date().toISOString();
  } else {
    patch.status = "provisioning";
  }

  await updateServer(input.serverId, patch);

  console.log("[AUTO PROVISION]", {
    serverId: input.serverId,
    fqdn: dns.fqdn,
    ip: origin.ip,
    originPort: origin.originPort,
    desktopUrl,
    dnsRecordId: dns.recordId,
    activated: config.autoActivate,
  });

  return {
    skipped: false,
    fqdn: dns.fqdn,
    desktopUrl,
    dnsRecordId: dns.recordId,
    activated: config.autoActivate,
    ip: origin.ip,
    originPort: origin.originPort,
  };
}

/** Terminate server, remove DNS, tear down Hetzner compute, clear desktop access. */
export async function terminateServerRecord(
  server: Pick<
    Server,
    "id" | "userId" | "cloudflareDnsRecordId" | "hetznerServerId" | "status"
  >
): Promise<void> {
  if (server.hetznerServerId && server.userId) {
    try {
      if (server.status === "online" || server.status === "active") {
        await teardownUserServer(server.userId, server.id);
      } else {
        await deleteHetznerServer(server.hetznerServerId);
      }
    } catch (err) {
      console.error("[TERMINATE] Hetzner cleanup failed:", err);
    }
  }

  await deprovisionServerDns(server);
  await updateServer(server.id, {
    status: "terminated",
    canceledAt: new Date().toISOString(),
    cancelAtPeriodEnd: false,
    guacamoleUrl: null,
    hetznerServerId: null,
    ip: null,
  });
}

/** Remove Cloudflare DNS when a subscription ends. */
export async function deprovisionServerDns(
  server: Pick<Server, "cloudflareDnsRecordId">
): Promise<void> {
  const config = getProvisionConfig();
  if (!config.deleteDnsOnTerminate) return;
  if (!config.cloudflareApiToken || !config.cloudflareZoneId) return;
  if (!server.cloudflareDnsRecordId) return;

  try {
    await deleteDnsRecord(
      config.cloudflareApiToken,
      config.cloudflareZoneId,
      server.cloudflareDnsRecordId
    );
    console.log("[AUTO DEPROVISION] DNS deleted", server.cloudflareDnsRecordId);
  } catch (err) {
    console.error("[AUTO DEPROVISION] DNS delete failed:", err);
  }
}
