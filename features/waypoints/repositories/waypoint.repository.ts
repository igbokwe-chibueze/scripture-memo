import { Prisma, type JourneyStage } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WAYPOINT_AUDIT_ACTIONS } from "@/features/waypoints/constants/waypoint-audit-actions";
import type {
  AssignWaypointResult,
  HideWaypointResult,
  PublishWaypointResult,
  ReorderWaypointResult,
  WaypointMove,
} from "@/features/waypoints/types/waypoint.types";

const waypointInclude = {
  verse: { select: { id: true, reference: true, book: true, isActive: true } },
  _count: { select: { userProgress: true, dayProgress: true, gameSessions: true } },
} satisfies Prisma.WaypointInclude;

const auditTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

const stageRank: Record<JourneyStage, number> = {
  LEARN: 0,
  RECALL: 1,
  STRENGTHEN: 2,
  MASTER: 3,
};

type OrderedStage = { number: number; journeyStage: JourneyStage };

/** A verse's appearances may repeat Master but can never move backwards in stage. */
function hasValidStageOrder(appearances: OrderedStage[]): boolean {
  const ordered = [...appearances].sort((left, right) => left.number - right.number);
  return ordered.every((appearance, index) => {
    const previous = ordered[index - 1];
    return !previous || stageRank[previous.journeyStage] <= stageRank[appearance.journeyStage];
  });
}

/** All database operations and curriculum invariants owned by waypoint management. */
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

  async create(actorId: string, ipAddress: string | null) {
    return prisma.$transaction(async (transaction) => {
      // WHY: Concurrent administrators could otherwise read the same maximum
      // number. This transaction-scoped PostgreSQL lock serializes only waypoint
      // appends and guarantees every new record receives the next final number.
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-waypoint-append'))`;
      const maximum = await transaction.waypoint.aggregate({ _max: { number: true } });
      const waypoint = await transaction.waypoint.create({
        data: { number: (maximum._max.number ?? 0) + 1, journeyStage: "LEARN", isActive: false },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: WAYPOINT_AUDIT_ACTIONS.create,
          entityType: "Waypoint",
          entityId: waypoint.id,
          ipAddress,
          metadata: { number: waypoint.number, isActive: false, provisionalStage: "LEARN" },
        },
      });
      return waypoint;
    }, auditTransactionOptions);
  },

  async assignVerse(
    waypointId: string,
    verseId: string,
    journeyStage: JourneyStage,
    actorId: string,
    ipAddress: string | null,
  ): Promise<AssignWaypointResult> {
    return prisma.$transaction(async (transaction) => {
      const [waypoint, verse, appearances] = await Promise.all([
        transaction.waypoint.findUnique({ where: { id: waypointId }, select: { id: true, number: true } }),
        transaction.verse.findFirst({ where: { id: verseId, isActive: true }, select: { id: true, reference: true } }),
        transaction.waypoint.findMany({
          where: { verseId, id: { not: waypointId } },
          select: { number: true, journeyStage: true },
        }),
      ]);
      if (!waypoint) return { status: "waypoint-missing" };
      if (!verse) return { status: "verse-unavailable" };

      if (journeyStage !== "MASTER") {
        const duplicate = appearances.find((appearance) => appearance.journeyStage === journeyStage);
        if (duplicate) return { status: "duplicate-stage", existingNumber: duplicate.number };
      }

      const candidateAppearances = [...appearances, { number: waypoint.number, journeyStage }];
      if (!hasValidStageOrder(candidateAppearances)) {
        const conflicting = appearances.find((appearance) =>
          (stageRank[appearance.journeyStage] < stageRank[journeyStage] && appearance.number > waypoint.number) ||
          (stageRank[appearance.journeyStage] > stageRank[journeyStage] && appearance.number < waypoint.number),
        );
        return {
          status: "stage-order",
          conflictingNumber: conflicting?.number ?? waypoint.number,
          conflictingStage: conflicting?.journeyStage ?? journeyStage,
        };
      }

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
      return { status: "assigned" };
    }, auditTransactionOptions);
  },

  async reorder(
    orderedWaypointIds: string[],
    actorId: string,
    ipAddress: string | null,
  ): Promise<ReorderWaypointResult> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.waypoint.findMany({
        select: {
          id: true,
          number: true,
          verseId: true,
          journeyStage: true,
          isActive: true,
          verse: { select: { reference: true } },
          _count: { select: { userProgress: true, dayProgress: true, gameSessions: true } },
        },
      });
      const currentById = new Map(current.map((waypoint) => [waypoint.id, waypoint]));
      if (
        currentById.size !== orderedWaypointIds.length ||
        new Set(orderedWaypointIds).size !== orderedWaypointIds.length ||
        orderedWaypointIds.some((id) => !currentById.has(id))
      ) return { status: "stale" };

      const proposed = orderedWaypointIds.map((id, index) => ({ ...currentById.get(id)!, number: index + 1 }));
      let hiddenSeen = false;
      for (const waypoint of proposed) {
        if (!waypoint.isActive) hiddenSeen = true;
        else if (hiddenSeen) return { status: "published-gap" };
      }

      const verseAppearances = new Map<string, OrderedStage[]>();
      for (const waypoint of proposed) {
        if (!waypoint.verseId) continue;
        const appearances = verseAppearances.get(waypoint.verseId) ?? [];
        appearances.push({ number: waypoint.number, journeyStage: waypoint.journeyStage });
        verseAppearances.set(waypoint.verseId, appearances);
      }
      if ([...verseAppearances.values()].some((appearances) => !hasValidStageOrder(appearances))) {
        return { status: "stage-order" };
      }

      const safeMoves: WaypointMove[] = [];
      for (const waypoint of proposed) {
        const previous = currentById.get(waypoint.id)!;
        if (previous.number === waypoint.number) continue;
        const hasProgress = previous._count.userProgress > 0 || previous._count.dayProgress > 0 || previous._count.gameSessions > 0;
        if (previous.isActive && hasProgress) return { status: "progress-locked" };
        safeMoves.push({
          id: waypoint.id,
          reference: waypoint.verse?.reference ?? null,
          from: previous.number,
          to: waypoint.number,
        });
      }
      if (safeMoves.length === 0) return { status: "reordered", moves: [] };

      // WHY: Moving the current range below zero first prevents unique-number
      // collisions. The offset derives from live data, so growth beyond the
      // original 220 slots remains safe without a hidden numerical ceiling.
      const largestNumber = current.reduce((largest, waypoint) => Math.max(largest, waypoint.number), 0);
      await transaction.waypoint.updateMany({ data: { number: { decrement: largestNumber + 1 } } });
      const positionCases = orderedWaypointIds.map((id, index) => Prisma.sql`WHEN ${id} THEN ${index + 1}`);
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
          metadata: {
            moveCount: safeMoves.length,
            moves: safeMoves.slice(0, 50).map(({ id, reference, from, to }) => ({ id, reference, from, to })),
            movesTruncated: safeMoves.length > 50,
          },
        },
      });
      return { status: "reordered", moves: safeMoves };
    }, auditTransactionOptions);
  },

  async publish(id: string, actorId: string, ipAddress: string | null): Promise<PublishWaypointResult> {
    return prisma.$transaction(async (transaction) => {
      const waypoint = await transaction.waypoint.findUnique({
        where: { id },
        include: { verse: { select: { id: true, reference: true, isActive: true } } },
      });
      if (!waypoint?.verse?.isActive) return { status: "unavailable" };

      const earlierHidden = await transaction.waypoint.count({
        where: { number: { lt: waypoint.number }, isActive: false },
      });
      if (earlierHidden > 0) return { status: "earlier-hidden" };

      const rank = stageRank[waypoint.journeyStage];
      if (rank > 0) {
        const requiredStage = (Object.keys(stageRank) as JourneyStage[]).find((stage) => stageRank[stage] === rank - 1);
        const prerequisite = requiredStage
          ? await transaction.waypoint.findFirst({
              where: {
                verseId: waypoint.verse.id,
                journeyStage: requiredStage,
                number: { lt: waypoint.number },
                isActive: true,
              },
            })
          : null;
        if (!prerequisite) return { status: "stage-prerequisite" };
      }

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
      return { status: "published" };
    }, auditTransactionOptions);
  },

  async hide(id: string, actorId: string, ipAddress: string | null): Promise<HideWaypointResult> {
    return prisma.$transaction(async (transaction) => {
      const waypoint = await transaction.waypoint.findUniqueOrThrow({ where: { id } });
      const laterPublished = await transaction.waypoint.count({
        where: { number: { gt: waypoint.number }, isActive: true },
      });
      if (laterPublished > 0) return "later-published";

      await transaction.waypoint.update({ where: { id }, data: { isActive: false } });
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
      return "hidden";
    }, auditTransactionOptions);
  },
} as const;
