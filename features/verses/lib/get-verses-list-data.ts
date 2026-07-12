import "server-only";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import type { VerseListFilters } from "@/features/verses/types/verse.types";

/** Authorizes and loads one filtered admin verse page. */
export async function getVersesListData(
  filters: VerseListFilters,
): Promise<Awaited<ReturnType<typeof verseRepository.findMany>>> {
  await getAdminSession();
  return verseRepository.findMany(filters);
}
