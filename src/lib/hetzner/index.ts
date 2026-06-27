/**
 * Hetzner integration — Storage Box subaccounts + Cloud compute deploy/teardown.
 * Server-side only. Import from this module in API routes and webhooks.
 */

export {
  HETZNER_LABELS,
  pokerprobeServerLabels,
} from "@/lib/hetzner/config";

export {
  buildStorageBoxRcloneCloudInit,
  SYNC_PATHS,
  VAULT_SOLVER_CACHE_DIR,
} from "@/lib/hetzner/cloud-init";

export {
  HetznerStorageError,
  ensureUserStorageSubaccount,
  createStorageSubaccount,
  deleteStorageSubaccount,
  clearUserStorageSubaccount,
  getUserStorageSubaccount,
  buildStorageHostUrl,
} from "@/lib/hetzner/storage";

export {
  HetznerComputeError,
  getHetznerComputeConfig,
  createHetznerServer,
  deleteHetznerServer,
  getHetznerServer,
  listHetznerServersForUser,
  deleteAllHetznerServersForUser,
} from "@/lib/hetzner/compute";

export {
  DeployUserServerError,
  deployUserServer,
  teardownUserServer,
  sweepUserComputeResources,
  launchServer,
  teardownServer,
} from "@/lib/hetzner/deploy";

export { getHetznerSkuForPlan, hetznerPlanSkus } from "@/lib/hetzner/plan-skus";

export { updateServerVaultLimit } from "@/lib/hetzner/vault";
