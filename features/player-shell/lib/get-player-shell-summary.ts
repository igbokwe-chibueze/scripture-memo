import "server-only";

import { requireServerSession } from "@/lib/auth/session";
import { playerShellRepository } from "@/features/player-shell/repositories/player-shell.repository";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";

/** Loads the authenticated learner's global counters for the protected shell. */
export async function getPlayerShellSummary(): Promise<PlayerShellSummary> {
  const session = await requireServerSession();
  return playerShellRepository.getSummary(session.user.id);
}
