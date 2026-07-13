import "server-only";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import type { VerseListFilters } from "@/features/verses/types/verse.types";
import { logger } from "@/lib/logger";

/** Authorizes and loads one filtered admin verse page. */
export async function getVersesListData(
  filters: VerseListFilters,
): Promise<Awaited<ReturnType<typeof verseRepository.findMany>>> {
  await getAdminSession();

  try {
    return await verseRepository.findMany(filters);
  } catch (error) {
    // WHY: The route error boundary gives administrators a safe generic message,
    // while this sanitized server log preserves enough context to diagnose a
    // database failure without exposing connection details in the browser.
    logger.error("Unable to load the admin verse list.", {
      error,
      page: filters.page,
      active: filters.active,
      sort: filters.sort,
    });
    throw error;
  }
}
