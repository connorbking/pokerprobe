/**
 * Cloud-init payloads for ephemeral compute nodes with Storage Box rclone sync.
 * Server-side only.
 */

import type { HetznerStorageSubaccount } from "@/lib/firestore-server";

export const SYNC_PATHS = {
  solverCache: "/mnt/solver-cache",
  vaultMount: "/mnt/cloud-vault",
  rcloneConfig: "/etc/rclone/pokerprobe.conf",
  syncEnv: "/opt/pokerprobe/sync-env.sh",
} as const;

/** Remote path inside the subaccount home for solver cache archives */
export const VAULT_SOLVER_CACHE_DIR = "solver-cache";

export function buildStorageBoxRcloneCloudInit(input: {
  userId: string;
  serverId: string;
  storage: Pick<
    HetznerStorageSubaccount,
    "host" | "username" | "password" | "homeDirectory"
  >;
}): string {
  const { userId, serverId, storage } = input;
  const remoteRoot = storage.homeDirectory.replace(/\/$/, "");
  const remoteCache = `${remoteRoot}/${VAULT_SOLVER_CACHE_DIR}`;

  return `#cloud-config
write_files:
  - path: ${SYNC_PATHS.rcloneConfig}
    permissions: '0600'
    content: |
      [pokerprobe-vault]
      type = sftp
      host = ${storage.host}
      user = ${storage.username}
      pass = ${storage.password}
      shell_type = unix

  - path: ${SYNC_PATHS.syncEnv}
    permissions: '0755'
    content: |
      #!/bin/bash
      export POKERPROBE_USER_ID="${userId}"
      export POKERPROBE_SERVER_ID="${serverId}"
      export POKERPROBE_VAULT_HOST="${storage.host}"
      export POKERPROBE_VAULT_USER="${storage.username}"
      export POKERPROBE_VAULT_HOME="${remoteRoot}"
      export POKERPROBE_CACHE="${SYNC_PATHS.solverCache}"
      export POKERPROBE_VAULT_REMOTE="pokerprobe-vault:${remoteCache}"

runcmd:
  - mkdir -p ${SYNC_PATHS.solverCache} ${SYNC_PATHS.vaultMount}
  - rclone copy pokerprobe-vault:${remoteCache}/ ${SYNC_PATHS.solverCache}/ --config ${SYNC_PATHS.rcloneConfig} --fast-list --transfers 8 || true
  - systemctl enable pokerprobe-sync.timer || true
`;
}
