import { badgeRepository } from "@/features/badges/repositories/badge.repository";
import type {
  BadgeEvent,
  BadgeUnlockResult,
} from "@/features/badges/types/badge.types";

/**
 * Routes a trusted domain event into the repository-owned badge transaction.
 *
 * Future features should emit events here after their own persistence succeeds;
 * they must never award badges or Glow Points directly.
 */
export async function evaluateBadgeProgress(
  userId: string,
  event: BadgeEvent,
): Promise<BadgeUnlockResult[]> {
  return badgeRepository.evaluate(userId, event);
}
