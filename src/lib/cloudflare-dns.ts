const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

interface CloudflareDnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  proxied: boolean;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors?: Array<{ message: string }>;
  result: T;
  result_info?: { total_count: number };
}

async function cloudflareFetch<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${CLOUDFLARE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json()) as CloudflareResponse<T>;
  if (!res.ok || !data.success) {
    const message =
      data.errors?.map((error) => error.message).join("; ") ||
      `Cloudflare API HTTP ${res.status}`;
    throw new Error(message);
  }

  return data.result;
}

/** DNS label: 8-char server slug under pokerprobe.com */
export function buildDnsRecordName(serverSlug: string): string {
  return serverSlug;
}

export function buildDnsFqdn(serverSlug: string, apexDomain: string): string {
  return `${buildDnsRecordName(serverSlug)}.${apexDomain}`;
}

export async function findDnsARecord(
  token: string,
  zoneId: string,
  fqdn: string
): Promise<CloudflareDnsRecord | null> {
  const result = await cloudflareFetch<CloudflareDnsRecord[]>(
    token,
    `/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(fqdn)}`,
    { method: "GET" }
  );

  return result[0] ?? null;
}

export async function upsertDnsARecord(options: {
  token: string;
  zoneId: string;
  serverSlug: string;
  apexDomain: string;
  ip: string;
  proxied: boolean;
}): Promise<{ recordId: string; fqdn: string; created: boolean }> {
  const name = buildDnsRecordName(options.serverSlug);
  const fqdn = `${name}.${options.apexDomain}`;
  const existing = await findDnsARecord(options.token, options.zoneId, fqdn);

  if (existing) {
    const updated = await cloudflareFetch<CloudflareDnsRecord>(
      options.token,
      `/zones/${options.zoneId}/dns_records/${existing.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          type: "A",
          name,
          content: options.ip,
          ttl: 1,
          proxied: options.proxied,
        }),
      }
    );

    return { recordId: updated.id, fqdn, created: false };
  }

  const created = await cloudflareFetch<CloudflareDnsRecord>(
    options.token,
    `/zones/${options.zoneId}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "A",
        name,
        content: options.ip,
        ttl: 1,
        proxied: options.proxied,
      }),
    }
  );

  return { recordId: created.id, fqdn, created: true };
}

export async function deleteDnsRecord(
  token: string,
  zoneId: string,
  recordId: string
): Promise<void> {
  await cloudflareFetch<{ id: string }>(
    token,
    `/zones/${zoneId}/dns_records/${recordId}`,
    { method: "DELETE" }
  );
}
