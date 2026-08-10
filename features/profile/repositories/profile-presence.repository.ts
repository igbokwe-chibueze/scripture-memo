import { prisma } from "@/lib/prisma";

const HEARTBEAT_WRITE_INTERVAL_MS = 15 * 60 * 1000;

/** Database boundary for the deliberately coarse player-presence heartbeat. */
export const profilePresenceRepository = {
  async markActive(userId: string, now: Date): Promise<void> {
    const staleBefore = new Date(now.getTime() - HEARTBEAT_WRITE_INTERVAL_MS);

    // WHY: updateMany performs the staleness check and write atomically. Many
    // open tabs therefore cannot turn a small presence feature into continuous
    // database writes, and missing profiles safely produce a no-op.
    await prisma.userProfile.updateMany({
      where: {
        userId,
        OR: [
          { lastSeenAt: null },
          { lastSeenAt: { lt: staleBefore } },
        ],
      },
      data: { lastSeenAt: now },
    });
  },
} as const;
