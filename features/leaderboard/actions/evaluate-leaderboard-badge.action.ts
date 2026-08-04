"use server";

import { evaluateBadgeProgress } from "@/features/badges/lib/badge-engine";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { leaderboardRepository } from "@/features/leaderboard/repositories/leaderboard.repository";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";

type LeaderboardBadgeData = {
  badgeUnlocks: BadgeUnlockResult[];
};

/**
 * Evaluates the top-100 badge using a fresh server-owned rank.
 *
 * WHY: The browser is allowed to request an evaluation, but it never submits a
 * rank. Re-querying the authenticated learner's global position prevents a
 * modified client from claiming the hidden Beacon Challenger badge.
 */
export async function evaluateLeaderboardBadgeAction(): Promise<
  ActionResult<LeaderboardBadgeData>
> {
  const session = await getServerSession();
  if (!session?.user) {
    return {
      success: false,
      message: "Authentication required.",
    };
  }

  try {
    // Fetch only the global scope needed by this badge. Fellowship and country
    // rankings are intentionally skipped to keep the background check small.
    const ranking = await leaderboardRepository.getGlobalRanking(
      1,
      5,
      session.user.id,
    );
    const globalRank = ranking.currentUser?.rank ?? null;

    if (globalRank === null || globalRank > 100) {
      return {
        success: true,
        message: "Leaderboard position checked.",
        data: { badgeUnlocks: [] },
      };
    }

    const badgeUnlocks = await evaluateBadgeProgress(session.user.id, {
      type: "LEADERBOARD_VIEWED",
      globalRank,
    });

    return {
      success: true,
      message: "Leaderboard position checked.",
      data: { badgeUnlocks },
    };
  } catch (error) {
    // The background check must not break the leaderboard itself. Log only the
    // authenticated user identifier and server error; no private data returns
    // to the browser.
    logger.error("Leaderboard badge evaluation failed.", {
      error,
      userId: session.user.id,
    });

    return {
      success: false,
      message: "The leaderboard badge could not be checked.",
    };
  }
}
