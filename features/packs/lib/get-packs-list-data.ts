import "server-only";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { packRepository } from "@/features/packs/repositories/pack.repository";

/** Authorizes and loads the complete administrative pack list. */
export async function getPacksListData(): Promise<Awaited<ReturnType<typeof packRepository.findMany>>> {
  await getAdminSession();
  return packRepository.findMany();
}
