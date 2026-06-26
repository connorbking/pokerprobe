/** DNS-safe user namespace slug derived from email local-part (before @). */

const MAX_SLUG_LENGTH = 48;
const MIN_SLUG_LENGTH = 2;

/** Subdomains reserved for platform infrastructure — never assign as userSlug */
export const RESERVED_USER_SLUGS = new Set([
  "www",
  "api",
  "access",
  "mail",
  "admin",
  "dashboard",
  "app",
  "static",
  "cdn",
  "blog",
  "support",
  "help",
  "docs",
  "status",
  "beta",
  "test",
  "staging",
  "dev",
  "ftp",
  "smtp",
  "webmail",
  "ns1",
  "ns2",
]);

/**
 * Extract and normalize the email local-part into a DNS label candidate.
 * e.g. John.Doe+tags@Sample.com → john-doe
 */
export function emailToUserSlugBase(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  const local = (at === -1 ? normalized : normalized.slice(0, at)).split("+")[0] ?? "";

  let slug = local
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/[._]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  if (slug.length < MIN_SLUG_LENGTH) {
    slug = `user-${local.replace(/[^a-z0-9]/g, "").slice(0, 8) || "acct"}`;
    slug = slug.replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, MAX_SLUG_LENGTH);
  }

  if (slug.length < MIN_SLUG_LENGTH) {
    return "user";
  }

  return slug;
}

export function isReservedUserSlug(slug: string): boolean {
  return RESERVED_USER_SLUGS.has(slug.toLowerCase());
}

/** Ordered candidates when the base slug is taken by another account. */
export function userSlugDuplicateCandidates(base: string, uid: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  function add(slug: string) {
    const trimmed = slug.slice(0, MAX_SLUG_LENGTH);
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    candidates.push(trimmed);
  }

  add(base);

  for (let n = 2; n <= 99; n++) {
    add(`${base}-${n}`);
  }

  const uidSuffix = uid.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase();
  if (uidSuffix) {
    add(`${base}-${uidSuffix}`);
  }

  return candidates;
}

export function pickAvailableUserSlug(
  email: string,
  uid: string,
  isSlugTaken: (slug: string) => boolean
): string {
  const base = emailToUserSlugBase(email);

  for (const candidate of userSlugDuplicateCandidates(base, uid)) {
    if (isReservedUserSlug(candidate)) continue;
    if (!isSlugTaken(candidate)) {
      return candidate;
    }
  }

  const fallback = `user-${uid.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase() || "acct"}`;
  return fallback.slice(0, MAX_SLUG_LENGTH);
}
