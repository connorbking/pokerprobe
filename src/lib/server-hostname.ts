import { siteConfig } from "@/lib/config";

const SERVER_SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SERVER_SLUG_LENGTH = 5;

/** Short per-server id: e.g. g76t4 */
export function generateServerSlug(): string {
  const bytes = new Uint8Array(SERVER_SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SERVER_SLUG_ALPHABET[b % SERVER_SLUG_ALPHABET.length]).join(
    ""
  );
}

/** Host part without apex domain: g76t4.jsmith */
export function buildServerHostPart(serverSlug: string, userSlug: string): string {
  return `${serverSlug}.${userSlug}`;
}

/** FQDN: g76t4.jsmith.pokerprobe.com */
export function buildServerFqdn(serverSlug: string, userSlug: string): string {
  return `${buildServerHostPart(serverSlug, userSlug)}.${siteConfig.serverDomain}`;
}

/** Myrtille desktop URL on the server host */
export function buildMyrtilleDesktopUrl(
  serverSlug: string,
  userSlug: string,
  options?: { port?: number | null }
): string {
  const host = buildServerFqdn(serverSlug, userSlug);
  const port = options?.port;
  const portSuffix =
    port != null && port > 0 && port !== 443 ? `:${port}` : "";
  return `https://${host}${portSuffix}/myrtille`;
}

/** Parse stored hostname (legacy flat slug or two-level host part). */
export function resolveServerFqdn(
  hostname: string | null | undefined,
  serverSlug: string | null | undefined,
  userSlug: string | null | undefined
): string | null {
  if (serverSlug && userSlug) {
    return buildServerFqdn(serverSlug, userSlug);
  }

  if (!hostname) return null;

  if (hostname.includes(".")) {
    return hostname.endsWith(`.${siteConfig.serverDomain}`)
      ? hostname
      : `${hostname}.${siteConfig.serverDomain}`;
  }

  return `${hostname}.${siteConfig.serverDomain}`;
}
