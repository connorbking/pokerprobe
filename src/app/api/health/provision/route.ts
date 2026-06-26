import { NextResponse } from "next/server";
import { getProvisionConfigStatus } from "@/lib/provision-config";

export async function GET() {
  const provision = getProvisionConfigStatus();
  return NextResponse.json({ provision });
}
