import "server-only";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { verseRepository } from "@/features/verses/repositories/verse.repository";

/** Authorizes and loads one verse for the admin editor. */
export async function getVerseEditData(
  id: string,
): Promise<Awaited<ReturnType<typeof verseRepository.findById>>> {
  await getAdminSession();
  return verseRepository.findById(id);
}
