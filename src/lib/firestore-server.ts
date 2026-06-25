import {
  firestoreGet,
  firestoreQuery,
  firestoreSet,
  firestoreUpdate,
  getAccessToken,
} from "./firestore";

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
}

export interface FirestoreUser {
  uid: string;
  email: string;
  stripeCustomerId: string | null;
  createdAt: string;
}

function getFirestoreEnv() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!projectId || !serviceAccountJson) {
    throw new Error(
      "Firestore is not configured. Set FIREBASE_PROJECT_ID and GOOGLE_SERVICE_ACCOUNT_JSON."
    );
  }

  return { projectId, serviceAccountJson };
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
    const patch: Record<string, unknown> = { email };
    if (stripeCustomerId) {
      patch.stripeCustomerId = stripeCustomerId;
    }
    await firestoreUpdate(projectId, `users/${uid}`, patch, token);
    return;
  }

  const user: FirestoreUser = {
    uid,
    email,
    stripeCustomerId: stripeCustomerId ?? null,
    createdAt: new Date().toISOString(),
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
