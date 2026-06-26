import { siteConfig } from "@/lib/config";

const SERVER_SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const SERVER_SLUG_LENGTH = 8;

/** Random 8-char DNS label, e.g. k7m2p9xq → k7m2p9xq.pokerprobe.com */
export function generateServerSlug(): string {
  const bytes = new Uint8Array(SERVER_SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SERVER_SLUG_ALPHABET[b % SERVER_SLUG_ALPHABET.length]).join(
    ""
  );
}

/** Host part without apex domain (single flat label). */
export function buildServerHostPart(serverSlug: string): string {
  return serverSlug;
}

/** FQDN: k7m2p9xq.pokerprobe.com */
export function buildServerFqdn(serverSlug: string): string {
  return `${serverSlug}.${siteConfig.serverDomain}`;
}

/** Legacy lab port-forward — never emit in public desktop URLs */
const LEGACY_DESKTOP_PORTS = new Set([8787]);

/** Drop legacy/non-public ports (8787, 443) so URLs use standard HTTPS. */
export function normalizeDesktopPort(port: number | null | undefined): number | null {
  if (port == null || port <= 0 || port === 443) return null;
  if (LEGACY_DESKTOP_PORTS.has(port)) return null;
  return port;
}

/** Myrtille desktop URL on the server host */
export function buildMyrtilleDesktopUrl(
  serverSlug: string,
  options?: { port?: number | null }
): string {
  const host = buildServerFqdn(serverSlug);
  const port = normalizeDesktopPort(options?.port);
  const portSuffix = port != null ? `:${port}` : "";
  return `https://${host}${portSuffix}/myrtille`;
}

/** Strip legacy :8787 from stored Firestore URLs */
export function normalizeGuacamoleUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/:8787(?=\/|$)/, "");
}

/** Canonical desktop URL — prefer slug rebuild over stale stored values */
export function resolveGuacamoleUrl(input: {
  serverSlug: string | null | undefined;
  guacamoleUrl: string | null | undefined;
  originPort?: number | null;
}): string | null {
  if (input.serverSlug) {
    return buildMyrtilleDesktopUrl(input.serverSlug, {
      port: input.originPort,
    });
  }
  return normalizeGuacamoleUrl(input.guacamoleUrl);
}

/** Resolve public FQDN from stored fields (supports legacy two-level hostnames). */
export function resolveServerFqdn(
  hostname: string | null | undefined,
  serverSlug: string | null | undefined,
  _userSlug?: string | null | undefined
): string | null {
  if (serverSlug) {
    return buildServerFqdn(serverSlug);
  }

  if (!hostname) return null;

  if (hostname.includes(".")) {
    return hostname.endsWith(`.${siteConfig.serverDomain}`)
      ? hostname
      : `${hostname}.${siteConfig.serverDomain}`;
  }

  return `${hostname}.${siteConfig.serverDomain}`;
}
