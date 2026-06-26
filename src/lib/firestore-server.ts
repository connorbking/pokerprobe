import {
  firestoreGet,
  firestoreQuery,
  firestoreSet,
  firestoreUpdate,
  getAccessToken,
} from "./firestore";
import { getFirestoreConfig } from "./firestore-env";

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
  hostname: string | null;
  username: string | null;
  guacamoleUrl: string | null;
  hetznerServerId: string | null;
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
  return data as unknown as Server;
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

export async function upsertUser(
  uid: string,
  email: string,
  stripeCustomerId?: string | null
): Promise<void> {
  const { projectId, token } = await getToken();
  const existing = await firestoreGet(projectId, `users/${uid}`, token);

  if (existing) {
    const patch: Record<string, unknown> = { email: email.toLowerCase() };
    if (stripeCustomerId) {
      patch.stripeCustomerId = stripeCustomerId;
    }
    await firestoreUpdate(projectId, `users/${uid}`, patch, token);
    return;
  }

  const user: FirestoreUser = {
    uid,
    email: email.toLowerCase(),
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
