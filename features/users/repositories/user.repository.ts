import { prisma } from "@/lib/prisma";
import type {
  AvatarFrameKey,
  AvatarKey,
} from "@/features/profile/data/avatar-catalog";
import {
  normalizeAvatarFrameKey,
  normalizeAvatarKey,
} from "@/features/profile/data/avatar-catalog";

export type UserProfileSummary = {
  displayName: string;
  countryCode: string | null;
  totalGlowPoints: number;
  totalWaypointsCompleted: number;
  totalHintsUsed: number;
  currentStreak: number;
  bestStreak: number;
  avatarKey: AvatarKey;
  avatarFrameKey: AvatarFrameKey;
  isPartner: boolean;
};

/** Read operations owned by the user-profile feature. */
export const userRepository = {
  /** Returns public-safe profile fields and personal gameplay totals. */
  async getProfileSummary(userId: string): Promise<UserProfileSummary | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        profile: {
          select: {
            displayName: true,
            countryCode: true,
            totalGlowPoints: true,
            totalWaypointsCompleted: true,
            totalHintsUsed: true,
            avatarKey: true,
            avatarFrameKey: true,
            isPartner: true,
          },
        },
        streak: { select: { currentStreak: true, bestStreak: true } },
      },
    });

    if (!user) return null;

    return {
      displayName: user.profile?.displayName ?? user.name,
      countryCode: user.profile?.countryCode ?? null,
      totalGlowPoints: user.profile?.totalGlowPoints ?? 0,
      totalWaypointsCompleted: user.profile?.totalWaypointsCompleted ?? 0,
      totalHintsUsed: user.profile?.totalHintsUsed ?? 0,
      currentStreak: user.streak?.currentStreak ?? 0,
      bestStreak: user.streak?.bestStreak ?? 0,
      avatarKey: normalizeAvatarKey(user.profile?.avatarKey),
      avatarFrameKey: normalizeAvatarFrameKey(user.profile?.avatarFrameKey),
      isPartner: user.profile?.isPartner ?? false,
    };
  },
} as const;
