import { deleteDnsRecord, upsertDnsARecord } from "@/lib/cloudflare-dns";
import {
  assertProvisionConfigReady,
  getProvisionConfig,
  getProvisionConfigStatus,
} from "@/lib/provision-config";
import {
  buildMyrtilleDesktopUrl,
  buildServerHostPart,
} from "@/lib/server-hostname";
import { updateServer, type Server } from "@/lib/firestore-server";

export interface AutoProvisionInput {
  serverId: string;
  serverSlug: string;
  userSlug: string;
}

export interface AutoProvisionResult {
  skipped: boolean;
  reason?: string;
  fqdn?: string;
  desktopUrl?: string;
  dnsRecordId?: string;
  activated?: boolean;
}

export function isAutoProvisionEnabled(): boolean {
  return getProvisionConfigStatus().configured;
}

/** DNS + desktop URL after checkout (lab: fixed IP; prod: Hetzner IP when ready). */
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

  const config = assertProvisionConfigReady();
  const hostname = buildServerHostPart(input.serverSlug, input.userSlug);

  const dns = await upsertDnsARecord({
    token: config.cloudflareApiToken!,
    zoneId: config.cloudflareZoneId!,
    serverSlug: input.serverSlug,
    userSlug: input.userSlug,
    apexDomain: config.apexDomain,
    ip: config.originIp!,
    proxied: config.dnsProxied,
  });

  const desktopUrl = buildMyrtilleDesktopUrl(input.serverSlug, input.userSlug, {
    port: config.originPort,
  });

  const patch: Partial<Server> = {
    hostname,
    guacamoleUrl: desktopUrl,
    ip: config.originIp,
    cloudflareDnsRecordId: dns.recordId,
    notes: `DNS ${dns.created ? "created" : "updated"} ${dns.fqdn} → ${config.originIp}${
      config.originPort ? `:${config.originPort}` : ""
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
  };
}

/** Terminate server, remove DNS, clear desktop access. */
export async function terminateServerRecord(
  server: Pick<Server, "id" | "cloudflareDnsRecordId">
): Promise<void> {
  await deprovisionServerDns(server);
  await updateServer(server.id, {
    status: "terminated",
    canceledAt: new Date().toISOString(),
    cancelAtPeriodEnd: false,
    guacamoleUrl: null,
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
