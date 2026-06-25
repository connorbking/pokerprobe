import { NextResponse } from "next/server";
import { getFirestoreConfigStatus } from "@/lib/firestore-env";

export async function GET() {
  const status = getFirestoreConfigStatus();
  return NextResponse.json({
    firestore: status,
  });
}
