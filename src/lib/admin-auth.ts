import { getUserByUid } from "@/lib/firestore-server";

export async function isFirestoreAdmin(uid: string): Promise<boolean> {
  const user = await getUserByUid(uid);
  return user?.isAdmin === true;
}
