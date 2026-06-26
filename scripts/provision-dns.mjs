/**
 * Create/update Cloudflare DNS + desktop URL for an existing server (lab / ops).
 *
 *   npm run provision-dns -- srv_abc123
 */

import { getFirestoreCredentials } from "./load-env.mjs";

const serverId = process.argv[2];

if (!serverId || serverId.startsWith("-")) {
  console.log(`
Usage: npm run provision-dns -- <serverId>

Requires PROVISION_DNS_ENABLED=true and Cloudflare env vars in .env.local
`);
  process.exit(serverId ? 0 : 1);
}

getFirestoreCredentials();

const { getServerById } = await import("../src/lib/firestore-server.ts");
const { autoProvisionServerDesktop } = await import("../src/lib/server-provision.ts");

const server = await getServerById(serverId);
if (!server) {
  throw new Error(`Server not found: ${serverId}`);
}
if (!server.serverSlug) {
  throw new Error(`Server ${serverId} is missing serverSlug`);
}

const result = await autoProvisionServerDesktop({
  serverId: server.id,
  serverSlug: server.serverSlug,
});

console.log(JSON.stringify(result, null, 2));

const updated = await getServerById(serverId);
console.log("\nDesktop URL:", updated?.guacamoleUrl);
console.log("Status:", updated?.status);
