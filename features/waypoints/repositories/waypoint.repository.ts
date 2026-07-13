import { Prisma, type JourneyStage } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WAYPOINT_AUDIT_ACTIONS } from "@/features/waypoints/constants/waypoint-audit-actions";
import type { AssignWaypointResult } from "@/features/waypoints/types/waypoint.types";

const waypointInclude = {
  verse: { select: { id: true, reference: true, book: true, isActive: true } },
} satisfies Prisma.WaypointInclude;

const auditTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** All runtime database operations owned by admin waypoint management. */
export const waypointRepository = {
  async findAll() {
    return prisma.waypoint.findMany({ include: waypointInclude, orderBy: { number: "asc" } });
  },

  async findByNumber(number: number) {
    return prisma.waypoint.findUnique({ where: { number }, include: waypointInclude });
  },

  async findById(id: string) {
    return prisma.waypoint.findUnique({ where: { id }, include: waypointInclude });
  },

  async findPublishedVerses() {
    return prisma.verse.findMany({
      where: { isActive: true },
      select: { id: true, reference: true, book: true },
      orderBy: [{ book: "asc" }, { chapter: "asc" }, { verseStart: "asc" }],
    });
  },

  async assignVerse(
    waypointId: string,
    verseId: string,
    journeyStage: JourneyStage,
    actorId: string,
    ipAddress: string | null,
  ): Promise<AssignWaypointResult> {
    return prisma.$transaction(async (transaction) => {
      const [waypoint, verse] = await Promise.all([
        transaction.waypoint.findUnique({ where: { id: waypointId }, select: { id: true, number: true } }),
        transaction.verse.findFirst({ where: { id: verseId, isActive: true }, select: { id: true, reference: true } }),
      ]);
      if (!waypoint) return "waypoint-missing";
      if (!verse) return "verse-unavailable";

      const updated = await transaction.waypoint.update({
        where: { id: waypointId },
        data: { verseId, journeyStage },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: WAYPOINT_AUDIT_ACTIONS.assignVerse,
          entityType: "Waypoint",
          entityId: waypointId,
          ipAddress,
          metadata: { number: waypoint.number, verseId, reference: verse.reference, journeyStage: updated.journeyStage },
        },
      });
      return "assigned";
    }, auditTransactionOptions);
  },

  async reorder(
    orderedWaypointIds: string[],
    actorId: string,
    ipAddress: string | null,
  ): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.waypoint.findMany({ select: { id: true, number: true } });
      const currentIds = new Set(current.map(({ id }) => id));
      if (
        currentIds.size !== 220 ||
        orderedWaypointIds.length !== 220 ||
        orderedWaypointIds.some((id) => !currentIds.has(id))
      ) return false;

      // WHY: Every number is unique. Moving the current range below zero first
      // prevents collisions, then one parameterized CASE update assigns all 220
      // final positions efficiently instead of issuing hundreds of round trips.
      await transaction.waypoint.updateMany({ data: { number: { decrement: 1_000 } } });
      const positionCases = orderedWaypointIds.map((id, index) =>
        Prisma.sql`WHEN ${id} THEN ${index + 1}`,
      );
      await transaction.$executeRaw(Prisma.sql`
        UPDATE "Waypoint"
        SET "number" = CASE "id" ${Prisma.join(positionCases, " ")} END,
            "updatedAt" = NOW()
        WHERE "id" IN (${Prisma.join(orderedWaypointIds)})
      `);
      await transaction.auditLog.create({
        data: {
          actorId,
          action: WAYPOINT_AUDIT_ACTIONS.reorder,
          entityType: "Waypoint",
          ipAddress,
          metadata: { waypointCount: orderedWaypointIds.length, orderedWaypointIds },
        },
      });
      return true;
    }, auditTransactionOptions);
  },

  async publish(id: string, actorId: string, ipAddress: string | null): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const waypoint = await transaction.waypoint.findFirst({
        where: { id, verse: { isActive: true } },
        include: { verse: { select: { reference: true } } },
      });
      if (!waypoint?.verse) return false;

      await transaction.waypoint.update({ where: { id }, data: { isActive: true } });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: WAYPOINT_AUDIT_ACTIONS.publish,
          entityType: "Waypoint",
          entityId: id,
          ipAddress,
          metadata: { number: waypoint.number, reference: waypoint.verse.reference, journeyStage: waypoint.journeyStage },
        },
      });
      return true;
    }, auditTransactionOptions);
  },

  async hide(id: string, actorId: string, ipAddress: string | null): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const waypoint = await transaction.waypoint.update({ where: { id }, data: { isActive: false } });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: WAYPOINT_AUDIT_ACTIONS.hide,
          entityType: "Waypoint",
          entityId: id,
          ipAddress,
          metadata: { number: waypoint.number },
        },
      });
    }, auditTransactionOptions);
  },
} as const;
