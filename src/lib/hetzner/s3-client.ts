/**
 * Minimal S3 client for Hetzner Object Storage (AWS SigV4, fetch-based).
 * Server-side only.
 */

import { createHash, createHmac } from "node:crypto";

export interface HetznerS3Config {
  accessKey: string;
  secretKey: string;
  endpoint: string;
  region: string;
}

function getHetznerS3Config(): HetznerS3Config {
  const accessKey = process.env.HETZNER_OBJECT_STORAGE_ACCESS_KEY?.trim() ?? "";
  const secretKey = process.env.HETZNER_OBJECT_STORAGE_SECRET_KEY?.trim() ?? "";
  const endpoint =
    process.env.HETZNER_OBJECT_STORAGE_ENDPOINT?.trim() ??
    "https://fsn1.your-objectstorage.com";
  const region =
    process.env.HETZNER_OBJECT_STORAGE_REGION?.trim() ?? "fsn1";

  if (!accessKey || !secretKey) {
    throw new Error("Hetzner Object Storage credentials are not configured");
  }

  return { accessKey, secretKey, endpoint, region };
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function signingKey(secret: string, date: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function signS3Request(input: {
  method: string;
  bucket: string;
  config: HetznerS3Config;
  amzDate: string;
  dateStamp: string;
}): { url: string; headers: Record<string, string> } {
  const { method, bucket, config, amzDate, dateStamp } = input;
  const host = new URL(config.endpoint).host;
  const canonicalUri = `/${bucket}`;
  const payloadHash = sha256("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = hmac(signingKey(config.secretKey, dateStamp, config.region), stringToSign)
    .toString("hex");

  const authorization = [
    "AWS4-HMAC-SHA256 Credential=" +
      `${config.accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    url: `${config.endpoint.replace(/\/$/, "")}${canonicalUri}`,
    headers: {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorization,
    },
  };
}

export async function headBucket(bucket: string): Promise<boolean> {
  const config = getHetznerS3Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const { url, headers } = signS3Request({
    method: "HEAD",
    bucket,
    config,
    amzDate,
    dateStamp,
  });

  const res = await fetch(url, { method: "HEAD", headers });
  if (res.status === 404 || res.status === 403) {
    return false;
  }
  if (res.ok) {
    return true;
  }
  throw new Error(`HeadBucket failed for ${bucket}: HTTP ${res.status}`);
}

export async function createBucket(bucket: string): Promise<void> {
  const config = getHetznerS3Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const { url, headers } = signS3Request({
    method: "PUT",
    bucket,
    config,
    amzDate,
    dateStamp,
  });

  const res = await fetch(url, { method: "PUT", headers });
  if (res.ok || res.status === 409) {
    return;
  }
  const body = await res.text().catch(() => "");
  throw new Error(
    `CreateBucket failed for ${bucket}: HTTP ${res.status}${body ? ` — ${body}` : ""}`
  );
}

export async function ensureBucket(bucket: string): Promise<void> {
  const exists = await headBucket(bucket).catch(() => false);
  if (!exists) {
    await createBucket(bucket);
  }
}

export function buildVaultBucketName(userId: string, serverId: string): string {
  return `pp-${userId.slice(0, 8)}-${serverId}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
}
