import { NextResponse } from "next/server";
import { getProvisionConfigStatus } from "@/lib/provision-config";
import { getProvisioningDefaults } from "@/lib/provision-defaults";

export async function GET() {
  const provision = getProvisionConfigStatus();
  let defaults = null;

  try {
    defaults = await getProvisioningDefaults();
  } catch (err) {
    console.error("[health/provision] failed to load Firestore defaults:", err);
  }

  return NextResponse.json({
    provision,
    defaults,
  });
}
