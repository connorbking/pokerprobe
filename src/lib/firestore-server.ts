import {
  firestoreGet,
  firestoreListCollection,
  firestoreQuery,
  firestoreSet,
  firestoreUpdate,
  getAccessToken,
} from "./firestore";
import { getFirestoreConfig } from "./firestore-env";
import {
  buildServerHostPart,
  generateServerSlug,
  normalizeDesktopPort,
  resolveGuacamoleUrl,
} from "./server-hostname";
import { resolveServerOrigin } from "./provision-defaults";
import {
  isReservedUserSlug,
  userSlugDuplicateCandidates,
  emailToUserSlugBase,
} from "./user-slug";

export type PlanId = "starter" | "pro" | "elite" | "baremetal";
export type ServerType = "cloud" | "dedicated";
export type ServerStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "suspended"
  | "terminated";

export interface Server {
  id: string;
  userId: string;
  userEmail: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  plan: PlanId;
  serverType: ServerType;
  status: ServerStatus;
  ip: string | null;
  /** HTTPS port for Myrtille desktop URL (null or 443 = standard) */
  originPort?: number | null;
  hostname: string | null;
  /** Flat DNS label (8 chars), e.g. k7m2p9xq → k7m2p9xq.pokerprobe.com */
  serverSlug: string | null;
  /** Owner slug from email (internal; not used in DNS) */
  userSlug: string | null;
  username: string | null;
  guacamoleUrl: string | null;
  hetznerServerId: string | null;
  /** Cloudflare DNS record id for {serverSlug} A record */
  cloudflareDnsRecordId?: string | null;
  /** Stripe subscription set to end at current period (no renewal) */
  cancelAtPeriodEnd?: boolean;
  /** ISO end of current Stripe billing period */
  currentPeriodEnd?: string | null;
  label: string;
  provisionedAt: string | null;
  canceledAt: string | null;
  notes: string;
  createdAt: string;
  /** Live metrics — populated when monitoring is wired up */
  cpuUsedPercent?: number | null;
  memoryUsedGb?: number | null;
  storageUsedGb?: number | null;
  activeVcpus?: number | null;
  uptimeSeconds?: number | null;
  /** Provisioning tags for sim install automation (Hetzner labels / cloud-init) */
  provisionTags?: string[];
  /** Sim programs reported installed on the server */
  installedSims?: string[];
}

export interface FirestoreUser {
  uid: string;
  email: string;
  /** DNS namespace from email local-part; unique platform-wide */
  userSlug: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  isAdmin?: boolean;
}

function getFirestoreEnv() {
  return getFirestoreConfig();
}

async function getToken(): Promise<{ projectId: string; token: string }> {
  const { projectId, serviceAccountJson } = getFirestoreEnv();
  const token = await getAccessToken(serviceAccountJson);
  return { projectId, token };
}

function docToServer(data: Record<string, unknown>): Server {
  const server = data as unknown as Server;
  const originPort = normalizeDesktopPort(server.originPort);
  return {
    ...server,
    originPort,
    guacamoleUrl: resolveGuacamoleUrl({
      serverSlug: server.serverSlug,
      guacamoleUrl: server.guacamoleUrl,
      originPort,
    }),
  };
}

export function generateServerId(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `srv_${suffix}`;
}

export async function getServersByUserId(userId: string): Promise<Server[]> {
  const { projectId, token } = await getToken();
  const docs = await firestoreQuery(
    projectId,
    "servers",
    "userId",
    userId,
    token
  );
  return docs.map(docToServer);
}

export async function getServerById(serverId: string): Promise<Server | null> {
  const { projectId, token } = await getToken();
  const doc = await firestoreGet(projectId, `servers/${serverId}`, token);
  return doc ? docToServer(doc) : null;
}

export async function getServerByServerSlug(
  serverSlug: string
): Promise<Server | null> {
  const { projectId, token } = await getToken();
  const docs = await firestoreQuery(
    projectId,
    "servers",
    "serverSlug",
    serverSlug.toLowerCase(),
    token
  );
  const server = docs[0];
  return server ? docToServer(server) : null;
}

/** Unique flat 8-char subdomain for new servers. */
export async function allocateServerSlug(): Promise<string> {
  for (let attempt = 0; attempt < 32; attempt++) {
    const slug = generateServerSlug();
    const taken = await getServerByServerSlug(slug);
    if (!taken) {
      return slug;
    }
  }
  throw new Error("Could not allocate unique server slug");
}

export async function getServerForUser(
  serverId: string,
  userId: string
): Promise<Server | null> {
  const server = await getServerById(serverId);
  if (!server || server.userId !== userId) {
    return null;
  }
  return server;
}

export async function createServer(
  data: Omit<Server, "id" | "createdAt">
): Promise<Server> {
  const { projectId, token } = await getToken();
  const id = generateServerId();
  const createdAt = new Date().toISOString();
  const server: Server = { ...data, id, createdAt };

  await firestoreSet(
    projectId,
    `servers/${id}`,
    server as unknown as Record<string, unknown>,
    token
  );
  return server;
}

export async function updateServer(
  serverId: string,
  data: Partial<Server>
): Promise<void> {
  const { projectId, token } = await getToken();
  await firestoreUpdate(
    projectId,
    `servers/${serverId}`,
    data as Record<string, unknown>,
    token
  );
}

async function allocateUserSlug(email: string, uid: string): Promise<string> {
  const base = emailToUserSlugBase(email);

  for (const candidate of userSlugDuplicateCandidates(base, uid)) {
    if (isReservedUserSlug(candidate)) continue;
    const owner = await getUserByUserSlug(candidate);
    if (!owner || owner.uid === uid) {
      return candidate;
    }
  }

  const fallback = `user-${uid.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase() || "acct"}`;
  return fallback.slice(0, 48);
}

/** Assign userSlug once; existing slug is never changed (stable DNS namespace). */
export async function ensureUserSlug(uid: string, email: string): Promise<string> {
  const user = await upsertUser(uid, email);
  if (!user.userSlug) {
    throw new Error(`Failed to assign userSlug for ${uid}`);
  }
  return user.userSlug;
}

/** Create or update the Firestore user record on sign-in (assigns userSlug on first auth). */
export async function syncFirestoreUserOnAuth(
  uid: string,
  email: string | null | undefined
): Promise<FirestoreUser | null> {
  if (!email) {
    return null;
  }

  return upsertUser(uid, email);
}

export async function upsertUser(
  uid: string,
  email: string,
  stripeCustomerId?: string | null
): Promise<FirestoreUser> {
  const { projectId, token } = await getToken();
  const normalizedEmail = email.toLowerCase();
  const existing = await firestoreGet(projectId, `users/${uid}`, token);

  if (existing) {
    const patch: Record<string, unknown> = { email: normalizedEmail };
    if (stripeCustomerId) {
      patch.stripeCustomerId = stripeCustomerId;
    }
    if (!existing.userSlug) {
      patch.userSlug = await allocateUserSlug(normalizedEmail, uid);
    }
    await firestoreUpdate(projectId, `users/${uid}`, patch, token);
    const updated = await getUserByUid(uid);
    if (!updated) {
      throw new Error(`Failed to reload user: ${uid}`);
    }
    return updated;
  }

  const userSlug = await allocateUserSlug(normalizedEmail, uid);
  const user: FirestoreUser = {
    uid,
    email: normalizedEmail,
    userSlug,
    stripeCustomerId: stripeCustomerId ?? null,
    createdAt: new Date().toISOString(),
    isAdmin: false,
  };

  await firestoreSet(
    projectId,
    `users/${uid}`,
    user as unknown as Record<string, unknown>,
    token
  );
  return user;
}

export async function getUserByStripeCustomerId(
  customerId: string
): Promise<{ uid: string; email: string } | null> {
  const { projectId, token } = await getToken();
  const docs = await firestoreQuery(
    projectId,
    "users",
    "stripeCustomerId",
    customerId,
    token
  );

  const user = docs[0];
  if (!user) return null;

  return {
    uid: user.uid as string,
    email: user.email as string,
  };
}

export async function getServersBySubscriptionId(
  subscriptionId: string
): Promise<Server[]> {
  const { projectId, token } = await getToken();
  const docs = await firestoreQuery(
    projectId,
    "servers",
    "stripeSubscriptionId",
    subscriptionId,
    token
  );
  return docs.map(docToServer);
}

export async function listServers(options?: {
  status?: ServerStatus;
  userEmail?: string;
}): Promise<Server[]> {
  const { projectId, token } = await getToken();

  let docs: Record<string, unknown>[];
  if (options?.status) {
    docs = await firestoreListCollection(projectId, "servers", token, {
      field: "status",
      value: options.status,
    });
  } else if (options?.userEmail) {
    docs = await firestoreQuery(
      projectId,
      "servers",
      "userEmail",
      options.userEmail.toLowerCase(),
      token
    );
  } else {
    docs = await firestoreListCollection(projectId, "servers", token);
  }

  return docs
    .map(docToServer)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export type ProvisionServerPatch = Partial<
  Pick<
    Server,
    | "status"
    | "hostname"
    | "serverSlug"
    | "userSlug"
    | "guacamoleUrl"
    | "username"
    | "hetznerServerId"
    | "ip"
    | "originPort"
    | "label"
    | "notes"
    | "installedSims"
    | "provisionTags"
  >
>;

/** Default host + Myrtille URL from slugs when operator activates a server. */
export async function defaultProvisionHostFields(
  server: Pick<
    Server,
    "serverSlug" | "hostname" | "guacamoleUrl" | "ip" | "originPort"
  >
): Promise<{ hostname: string; guacamoleUrl: string } | null> {
  if (!server.serverSlug) {
    return null;
  }

  const hostname = buildServerHostPart(server.serverSlug);
  const { originPort } = await resolveServerOrigin(server);
  const guacamoleUrl = resolveGuacamoleUrl({
    serverSlug: server.serverSlug,
    guacamoleUrl: server.guacamoleUrl,
    originPort,
  })!;

  return { hostname, guacamoleUrl };
}

/** Operator update after manual or automated infrastructure setup */
export async function provisionServerRecord(
  serverId: string,
  patch: ProvisionServerPatch
): Promise<Server> {
  const existing = await getServerById(serverId);
  if (!existing) {
    throw new Error(`Server not found: ${serverId}`);
  }

  const data: Record<string, unknown> = { ...patch };

  if (patch.status === "active") {
    const defaults = await defaultProvisionHostFields({
      serverSlug: (patch.serverSlug ?? existing.serverSlug) as string | null,
      hostname: (patch.hostname ?? existing.hostname) as string | null,
      guacamoleUrl: (patch.guacamoleUrl ?? existing.guacamoleUrl) as string | null,
      ip: (patch.ip ?? existing.ip) as string | null,
      originPort: (patch.originPort ?? existing.originPort) as number | null | undefined,
    });
    if (defaults) {
      if (!patch.hostname && !existing.hostname) {
        data.hostname = defaults.hostname;
      }
      if (!patch.guacamoleUrl && !existing.guacamoleUrl) {
        data.guacamoleUrl = defaults.guacamoleUrl;
      }
    }
  }

  if (patch.status === "active" && !existing.provisionedAt) {
    data.provisionedAt = new Date().toISOString();
  }

  if (patch.status === "provisioning" && existing.status === "pending") {
    data.provisionedAt = null;
  }

  await updateServer(serverId, data as Partial<Server>);
  const updated = await getServerById(serverId);
  if (!updated) {
    throw new Error(`Failed to reload server: ${serverId}`);
  }
  return updated;
}

function docToUser(data: Record<string, unknown>): FirestoreUser {
  return data as unknown as FirestoreUser;
}

export async function getUserByUid(uid: string): Promise<FirestoreUser | null> {
  const { projectId, token } = await getToken();
  const doc = await firestoreGet(projectId, `users/${uid}`, token);
  return doc ? docToUser(doc) : null;
}

export async function getUserByEmail(
  email: string
): Promise<FirestoreUser | null> {
  const { projectId, token } = await getToken();
  const docs = await firestoreQuery(
    projectId,
    "users",
    "email",
    email.toLowerCase(),
    token
  );
  const user = docs[0];
  return user ? docToUser(user) : null;
}

export async function getUserByUserSlug(
  userSlug: string
): Promise<FirestoreUser | null> {
  const { projectId, token } = await getToken();
  const docs = await firestoreQuery(
    projectId,
    "users",
    "userSlug",
    userSlug.toLowerCase(),
    token
  );
  const user = docs[0];
  return user ? docToUser(user) : null;
}

export async function setUserAdmin(uid: string, isAdmin: boolean): Promise<void> {
  const { projectId, token } = await getToken();
  await firestoreUpdate(projectId, `users/${uid}`, { isAdmin }, token);
}

export async function setUserAdminByEmail(
  email: string,
  isAdmin: boolean
): Promise<FirestoreUser> {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(
      `No Firestore user found for ${email}. Sign in once so the account is created, then rerun.`
    );
  }
  await setUserAdmin(user.uid, isAdmin);
  return { ...user, isAdmin };
}

export async function updateUserStripeCustomerId(
  uid: string,
  stripeCustomerId: string
): Promise<void> {
  const { projectId, token } = await getToken();
  await firestoreUpdate(
    projectId,
    `users/${uid}`,
    { stripeCustomerId },
    token
  );
}
