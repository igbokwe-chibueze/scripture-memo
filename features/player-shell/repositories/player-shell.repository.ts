import { prisma } from "@/lib/prisma";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";

/** Owns the single compact query used by the universal protected top bar. */
export const playerShellRepository = {
  async getSummary(userId: string): Promise<PlayerShellSummary> {
    // WHY: All three values are selected through one learner query. The shell
    // must never poll or load reward ledgers merely to render global counters.
    // UserProfile and UserStreak are the existing trusted summary records.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            totalGlowPoints: true,
            beaconXp: true,
          },
        },
        streak: {
          select: {
            currentStreak: true,
          },
        },
      },
    });

    return {
      glowPoints: user?.profile?.totalGlowPoints ?? 0,
      streakDays: user?.streak?.currentStreak ?? 0,
      beaconPoints: user?.profile?.beaconXp ?? 0,
    };
  },
} as const;
