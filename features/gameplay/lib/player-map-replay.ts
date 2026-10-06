import { CompletionStatus } from "@/lib/generated/prisma/enums";
import { GAME_MODE_ORDER } from "@/lib/constants";
import type { GameMode } from "@/lib/generated/prisma/enums";
import type { GameplaySessionData } from "@/features/gameplay/types/game-session.types";

/**
 * Distinguishes an ordinary session URL from a valid learner practice request.
 * Invalid requests are kept separate from absent requests so the server view
 * can reject malformed or unauthorized query values instead of falling back to
 * the normal gameplay screen.
 */
export type PlayerMapReplayResolution =
  | { kind: "NONE" }
  | { kind: "INVALID" }
  | { kind: "PRACTICE"; mode: GameMode };

/** Narrows a URL string to one of the app's five canonical game modes. */
export function isGameModeSelection(value: unknown): value is GameMode {
  return (
    typeof value === "string" &&
    GAME_MODE_ORDER.some((candidate) => candidate === value)
  );
}

/**
 * Resolves the one practice mode allowed by an owned, completed campaign day.
 * The completed mode list is derived from completed database attempts, while
 * the remaining fields prevent this entry point from being used for active,
 * administrator-test, or Vault replay sessions.
 */
export function resolvePlayerMapReplayMode(
  requestedMode: string | string[] | undefined,
  session: GameplaySessionData | null,
): PlayerMapReplayResolution {
  if (requestedMode === undefined) return { kind: "NONE" };
  if (typeof requestedMode !== "string" || !session) {
    return { kind: "INVALID" };
  }

  const mode = isGameModeSelection(requestedMode) ? requestedMode : null;
  if (
    !mode ||
    session.status !== CompletionStatus.COMPLETED ||
    session.isAdminTest ||
    session.isVaultReplay ||
    !session.waypointId ||
    !session.dayLevel ||
    !session.completedModes.includes(mode)
  ) {
    return { kind: "INVALID" };
  }

  return { kind: "PRACTICE", mode };
}
