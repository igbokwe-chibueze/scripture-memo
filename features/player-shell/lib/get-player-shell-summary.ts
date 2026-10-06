import "server-only";

import { cache } from "react";
import { requireServerSession } from "@/lib/auth/session";
import { playerShellRepository } from "@/features/player-shell/repositories/player-shell.repository";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";

/**
 * Loads the authenticated learner's global counters once per server render.
 *
 * WHY: The protected shell and Game Home both display Glow Points and streak.
 * React's request-scoped cache lets both callers share the same narrow query
 * without making these values stale across separate page requests.
 */
export const getPlayerShellSummary = cache(
  async (): Promise<PlayerShellSummary> => {
    const session = await requireServerSession();
    return playerShellRepository.getSummary(session.user.id);
  },
);
