/** Shared Hetzner label keys for resource isolation and cron sweeps */
export const HETZNER_LABELS = {
  app: "app",
  pokerprobeUserId: "pokerprobe_user_id",
  pokerprobeServerId: "pokerprobe_server_id",
} as const;

export function pokerprobeServerLabels(input: {
  userId: string;
  serverId: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  return {
    [HETZNER_LABELS.app]: "pokerprobe",
    [HETZNER_LABELS.pokerprobeUserId]: input.userId,
    [HETZNER_LABELS.pokerprobeServerId]: input.serverId,
    ...input.extra,
  };
}
