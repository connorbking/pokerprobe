import { siteConfig } from "@/lib/config";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function envBool(name: string, defaultValue: boolean): boolean {
  const value = env(name).toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return defaultValue;
}

export interface ProvisionConfig {
  /** Create Cloudflare DNS on checkout */
  dnsEnabled: boolean;
  cloudflareApiToken: string | null;
  cloudflareZoneId: string | null;
  /** A record target — lab home IP or Hetzner VM IP */
  originIp: string | null;
  /** Optional non-standard HTTPS port (e.g. 8787 lab port-forward) */
  originPort: number | null;
  /** Orange-cloud proxy — off for non-443 lab ports */
  dnsProxied: boolean;
  /** Mark server active + set desktop URL after DNS (lab default true) */
  autoActivate: boolean;
  /** Remove DNS record when subscription is canceled */
  deleteDnsOnTerminate: boolean;
  apexDomain: string;
}

export interface ProvisionConfigStatus {
  configured: boolean;
  dnsEnabled: boolean;
  hasCloudflareToken: boolean;
  hasCloudflareZoneId: boolean;
  hasOriginIp: boolean;
  originPort: number | null;
  dnsProxied: boolean;
  autoActivate: boolean;
  missing: string[];
}

export function getProvisionConfig(): ProvisionConfig {
  const portRaw = env("PROVISION_ORIGIN_PORT");
  const originPort = portRaw ? Number.parseInt(portRaw, 10) : null;

  return {
    dnsEnabled: envBool("PROVISION_DNS_ENABLED", false),
    cloudflareApiToken: env("CLOUDFLARE_API_TOKEN") || null,
    cloudflareZoneId: env("CLOUDFLARE_ZONE_ID") || null,
    originIp: env("PROVISION_ORIGIN_IP") || null,
    originPort:
      originPort != null && Number.isFinite(originPort) && originPort > 0
        ? originPort
        : null,
    dnsProxied: envBool("PROVISION_DNS_PROXIED", false),
    autoActivate: envBool("PROVISION_AUTO_ACTIVATE", true),
    deleteDnsOnTerminate: envBool("PROVISION_DNS_DELETE_ON_TERMINATE", true),
    apexDomain: siteConfig.serverDomain,
  };
}

export function getProvisionConfigStatus(): ProvisionConfigStatus {
  const config = getProvisionConfig();
  const missing: string[] = [];

  if (!config.dnsEnabled) {
    return {
      configured: false,
      dnsEnabled: false,
      hasCloudflareToken: Boolean(config.cloudflareApiToken),
      hasCloudflareZoneId: Boolean(config.cloudflareZoneId),
      hasOriginIp: Boolean(config.originIp),
      originPort: config.originPort,
      dnsProxied: config.dnsProxied,
      autoActivate: config.autoActivate,
      missing: ["PROVISION_DNS_ENABLED"],
    };
  }

  if (!config.cloudflareApiToken) missing.push("CLOUDFLARE_API_TOKEN");
  if (!config.cloudflareZoneId) missing.push("CLOUDFLARE_ZONE_ID");
  if (!config.originIp) missing.push("PROVISION_ORIGIN_IP");

  return {
    configured: missing.length === 0,
    dnsEnabled: true,
    hasCloudflareToken: Boolean(config.cloudflareApiToken),
    hasCloudflareZoneId: Boolean(config.cloudflareZoneId),
    hasOriginIp: Boolean(config.originIp),
    originPort: config.originPort,
    dnsProxied: config.dnsProxied,
    autoActivate: config.autoActivate,
    missing,
  };
}

export function assertProvisionConfigReady(): ProvisionConfig {
  const status = getProvisionConfigStatus();
  if (!status.dnsEnabled) {
    throw new Error("DNS provisioning is disabled (PROVISION_DNS_ENABLED=false).");
  }
  if (!status.configured) {
    throw new Error(
      `DNS provisioning is not configured. Missing: ${status.missing.join(", ")}.`
    );
  }
  return getProvisionConfig();
}
