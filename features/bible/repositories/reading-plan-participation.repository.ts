import "server-only";

/** Account-scoped social state, independent of device progress and rewards.
 * Each explicit state change is one atomic statement; reads never initialize.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ReadingPlanId } from "../data/reading-plan-catalog";
import type { ReadingPlanParticipationInput } from "../schemas/reading-plan-participation.schema";
import type { ReadingPlanParticipants } from "../types/reading-plan-participation.types";

export const readingPlanParticipationRepository = {
  /** Server timestamps and conditional conflict updates prevent daily write
   * amplification even with stale browsers, concurrent tabs or forged clocks.
   * start never reactivates an existing completed/inactive row just by opening it.
   */
  async update(
    userId: string,
    input: ReadingPlanParticipationInput,
    now = new Date(),
  ): Promise<void> {
    const { planId, operation } = input;
    if (operation === "reset") {
      await prisma.readingPlanParticipation.deleteMany({
        where: { userId, planId },
      });
      return;
    }
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const completed = operation === "complete" ? now : null;
    const conflict =
      operation === "start"
        ? Prisma.sql`DO NOTHING`
        : operation === "complete"
          ? Prisma.sql`
        DO UPDATE SET "completedAt" = EXCLUDED."completedAt"
        WHERE "ReadingPlanParticipation"."completedAt" IS NULL`
          : Prisma.sql`
        DO UPDATE SET "completedAt" = NULL,
          "lastActiveAt" = CASE WHEN "ReadingPlanParticipation"."lastActiveAt" < ${day}
            THEN EXCLUDED."lastActiveAt" ELSE "ReadingPlanParticipation"."lastActiveAt" END
        WHERE "ReadingPlanParticipation"."completedAt" IS NOT NULL
          OR "ReadingPlanParticipation"."lastActiveAt" < ${day}`;
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ReadingPlanParticipation" ("userId", "planId", "startedAt", "lastActiveAt", "completedAt")
      VALUES (${userId}, ${planId}, ${now}, ${now}, ${completed})
      ON CONFLICT ("userId", "planId") ${conflict}
    `);
  },

  /** One indexed aggregate query per opened plan. The same eligible set supplies
   * count and four portraits. Suspended/banned/blocked accounts are not disclosed.
   * Thirty rolling days is an eligibility filter, never a scheduled mutation.
   */
  async summary(
    viewerId: string,
    planId: ReadingPlanId,
    now = new Date(),
  ): Promise<ReadingPlanParticipants> {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<ReadingPlanParticipants[]>(Prisma.sql`
      WITH eligible AS MATERIALIZED (
        SELECT profile."publicId", profile."displayName", profile."avatarKey", profile."avatarFrameKey", p."lastActiveAt"
        FROM "ReadingPlanParticipation" p
        JOIN "user" account ON account.id = p."userId"
        JOIN "UserProfile" profile ON profile."userId" = p."userId"
        WHERE p."planId" = ${planId} AND p."completedAt" IS NULL AND p."lastActiveAt" >= ${cutoff}
          AND NOT account.banned AND account."suspendedAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM "PlayerBlock" block WHERE
            (block."blockerId" = ${viewerId} AND block."blockedId" = p."userId") OR
            (block."blockedId" = ${viewerId} AND block."blockerId" = p."userId"))
      )
      SELECT (SELECT COUNT(*)::int FROM eligible) AS total,
        COALESCE((SELECT jsonb_agg(preview) FROM (
          SELECT "publicId", "displayName", "avatarKey", "avatarFrameKey" FROM eligible
          ORDER BY "lastActiveAt" DESC, "publicId" LIMIT 4
        ) preview), '[]'::jsonb) AS avatars
    `);
    return rows[0] ?? { total: 0, avatars: [] };
  },
};
