import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server-auth";
import { ServerManageClient } from "./ServerManageClient";

export const metadata: Metadata = {
  title: "Manage Server",
};

type PageProps = {
  params: Promise<{ serverId: string }>;
};

export default async function ServerManagePage({ params }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    const { serverId } = await params;
    redirect(`/signin?callbackUrl=/dashboard/servers/${serverId}`);
  }

  const { serverId } = await params;
  return <ServerManageClient serverId={serverId} />;
}
