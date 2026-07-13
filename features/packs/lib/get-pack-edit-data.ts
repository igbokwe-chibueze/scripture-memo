import "server-only";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { packRepository } from "@/features/packs/repositories/pack.repository";

/** Authorizes and loads one pack plus published verses not yet assigned to it. */
export async function getPackEditData(id: string): Promise<{
  pack: Awaited<ReturnType<typeof packRepository.findById>>;
  availableVerses: Awaited<ReturnType<typeof packRepository.findAvailableVerses>>;
}> {
  await getAdminSession();
  const [pack, availableVerses] = await Promise.all([
    packRepository.findById(id),
    packRepository.findAvailableVerses(id),
  ]);
  return { pack, availableVerses };
}
