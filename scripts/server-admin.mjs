/**
 * Manage PokerProbe server records in Firestore (operator CLI).
 *
 * Usage:
 *   npm run server-admin -- list
 *   npm run server-admin -- list --status pending
 *   npm run server-admin -- list --email user@example.com
 *   npm run server-admin -- get srv_abc123
 *   npm run server-admin -- activate srv_abc123 \
 *     --hostname g76t4.jsmith \
 *     --guacamole-url "https://g76t4.jsmith.pokerprobe.com/myrtille" \
 *     --username Administrator
 *   npm run server-admin -- update srv_abc123 --status provisioning --notes "Hetzner ordered"
 *
 * Requires .env.local with FIREBASE_PROJECT_ID + service account credentials.
 */

import { getFirestoreCredentials } from "./load-env.mjs";

const args = process.argv.slice(2);
const command = args[0];

function flag(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.log(`
PokerProbe server admin (Firestore)

Commands:
  list [--status pending|provisioning|active|suspended] [--email user@example.com]
  get <serverId>
  activate <serverId> [--hostname host-part] [--guacamole-url url] [--username name] [--ip addr] [--hetzner-id id] [--installed-sims flopzilla,piosolver]
  update <serverId> [--status status] [--hostname host-part] [--guacamole-url url] [--username name] [--ip addr] [--notes text] [--label name]

  activate without --hostname or --guacamole-url fills both from serverSlug + userSlug
  (Myrtille URL: https://{serverSlug}.{userSlug}.pokerprobe.com/myrtille)

Examples:
  npm run server-admin -- list --status pending
  npm run server-admin -- activate srv_abc --username Administrator
  npm run server-admin -- activate srv_abc --hostname g76t4.jsmith --guacamole-url "https://g76t4.jsmith.pokerprobe.com/myrtille"
`);
}

if (!command || command === "--help" || command === "-h") {
  usage();
  process.exit(0);
}

const { projectId, saJson } = getFirestoreCredentials();

const {
  getServerById,
  listServers,
  provisionServerRecord,
} = await import("../src/lib/firestore-server.ts");

async function run() {
  if (command === "list") {
    const status = flag("--status");
    const email = flag("--email");
    const servers = await listServers({
      status: status || undefined,
      userEmail: email || undefined,
    });

    if (servers.length === 0) {
      console.log("No servers found.");
      return;
    }

    for (const server of servers) {
      console.log(
        [
          server.id,
          server.status.padEnd(13),
          server.plan.padEnd(8),
          server.userEmail,
          server.label,
        ].join("  ")
      );
    }
    console.log(`\n${servers.length} server(s)`);
    return;
  }

  if (command === "get") {
    const serverId = args[1];
    if (!serverId) {
      throw new Error("Usage: get <serverId>");
    }
    const server = await getServerById(serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }
    console.log(JSON.stringify(server, null, 2));
    return;
  }

  if (command === "activate" || command === "update") {
    const serverId = args[1];
    if (!serverId) {
      throw new Error(`Usage: ${command} <serverId> [options]`);
    }

    const patch = {};

    if (command === "activate") {
      patch.status = "active";
    }

    const status = flag("--status");
    if (status) patch.status = status;

    const hostname = flag("--hostname");
    if (hostname) patch.hostname = hostname;

    const guacamoleUrl = flag("--guacamole-url");
    if (guacamoleUrl) patch.guacamoleUrl = guacamoleUrl;

    const username = flag("--username");
    if (username) patch.username = username;

    const ip = flag("--ip");
    if (ip) patch.ip = ip;

    const hetznerId = flag("--hetzner-id");
    if (hetznerId) patch.hetznerServerId = hetznerId;

    const notes = flag("--notes");
    if (notes) patch.notes = notes;

    const label = flag("--label");
    if (label) patch.label = label;

    const installedSims = flag("--installed-sims");
    if (installedSims) {
      patch.installedSims = installedSims.split(",").map((s) => s.trim());
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No fields to update. Pass at least one option.");
    }

    const server = await provisionServerRecord(serverId, patch);
    console.log(`Updated ${serverId}:`);
    console.log(JSON.stringify(server, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
