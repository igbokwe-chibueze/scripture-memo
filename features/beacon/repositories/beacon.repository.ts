import type { Prisma } from "@/lib/generated/prisma/client";
import { BeaconLeague } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  BEACON_COHORT_SIZE,
  BEACON_DEMOTION_COUNT,
  BEACON_PROMOTION_COUNT,
  beaconLevelFromXp,
  beaconLevelStartXp,
  demotedLeague,
  promotedLeague,
  saintCrownAward,
} from "@/features/beacon/constants/beacon-progression";
import { getBeaconWeekWindow } from "@/features/beacon/lib/beacon-week";
import type { BeaconProgressionResult } from "@/features/beacon/types/beacon.types";

type BeaconAwardInput = {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  earnedAt: Date;
  waypointCompleted: boolean;
};

/** Computes a stable rank inside one completed cohort. */
async function getPreviousRank(
  transaction: Prisma.TransactionClient,
  cohortId: string,
  weekId: string,
  userId: string,
): Promise<{ rank: number; playerCount: number } | null> {
  const members = await transaction.beaconLeagueMembership.findMany({
    where: { cohortId },
    select: {
      userId: true,
      createdAt: true,
      user: {
        select: {
          beaconWeeklyScores: {
            // WHY: A user can belong to a cohort every week. Binding the score
            // to this exact completed week prevents a newer score from being
            // mistaken for the result that decides promotion or demotion.
            where: { weekId },
            select: {
              points: true,
              waypointsCompleted: true,
              lastScoredAt: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  const ordered = members.toSorted((left, right) => {
    const leftScore = left.user.beaconWeeklyScores[0];
    const rightScore = right.user.beaconWeeklyScores[0];
    return (
      (rightScore?.points ?? 0) - (leftScore?.points ?? 0) ||
      (rightScore?.waypointsCompleted ?? 0) -
        (leftScore?.waypointsCompleted ?? 0) ||
      (leftScore?.lastScoredAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (rightScore?.lastScoredAt?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
      left.createdAt.getTime() - right.createdAt.getTime()
    );
  });
  const index = ordered.findIndex((member) => member.userId === userId);
  return index < 0 ? null : { rank: index + 1, playerCount: ordered.length };
}

/** Determines next league and Saint prestige from the previous weekly finish. */
async function getLeaguePlacement(
  transaction: Prisma.TransactionClient,
  userId: string,
  currentStartsAt: Date,
): Promise<{ league: BeaconLeague; previousLeague: BeaconLeague | null; crowns: number }> {
  const previous = await transaction.beaconLeagueMembership.findFirst({
    where: { userId, week: { startsAt: { lt: currentStartsAt } } },
    orderBy: { week: { startsAt: "desc" } },
    select: { id: true, weekId: true, league: true, cohortId: true },
  });
  if (!previous) {
    return { league: BeaconLeague.TRAVELER, previousLeague: null, crowns: 0 };
  }

  const standing = await getPreviousRank(
    transaction,
    previous.cohortId,
    previous.weekId,
    userId,
  );
  if (!standing) {
    return { league: previous.league, previousLeague: previous.league, crowns: 0 };
  }

  const promoted = standing.rank <= BEACON_PROMOTION_COUNT;
  const demoted =
    !promoted &&
    standing.playerCount >= 10 &&
    standing.rank > standing.playerCount - BEACON_DEMOTION_COUNT;
  const league = promoted
    ? promotedLeague(previous.league)
    : demoted
      ? demotedLeague(previous.league)
      : previous.league;
  const crowns =
    previous.league === BeaconLeague.SAINT
      ? saintCrownAward(standing.rank)
      : 0;

  // WHY: The finalized result is persisted once when the next weekly
  // membership is created. This keeps historical league screens auditable and
  // makes Crown grants traceable to the exact Saint finish that earned them.
  await transaction.beaconLeagueMembership.update({
    where: { id: previous.id },
    data: {
      finalRank: standing.rank,
      crownAward: crowns,
    },
  });

  return { league, previousLeague: previous.league, crowns };
}

/** Assigns the learner to the first non-full cohort under a transaction lock. */
async function ensureMembership(
  transaction: Prisma.TransactionClient,
  weekId: string,
  startsAt: Date,
  userId: string,
): Promise<BeaconLeague> {
  // WHY: A learner must have at most one membership per week. Locking by user
  // and week closes the race where two first scores both pass the initial
  // existence check before either transaction creates the membership.
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${`beacon-membership:${weekId}:${userId}`})
    )
  `;

  const existing = await transaction.beaconLeagueMembership.findUnique({
    where: { weekId_userId: { weekId, userId } },
    select: { league: true },
  });
  if (existing) return existing.league;

  const placement = await getLeaguePlacement(transaction, userId, startsAt);

  // WHY: Cohort capacity must be serialized. Without this advisory lock, two
  // simultaneous first scores could both observe slot 30 and overfill a group.
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${`beacon:${weekId}:${placement.league}`})
    )
  `;

  const cohorts = await transaction.beaconLeagueCohort.findMany({
    where: { weekId, league: placement.league },
    orderBy: { groupNumber: "asc" },
    select: { id: true, groupNumber: true, _count: { select: { memberships: true } } },
  });
  let cohort = cohorts.find(
    (item) => item._count.memberships < BEACON_COHORT_SIZE,
  );
  if (!cohort) {
    cohort = await transaction.beaconLeagueCohort.create({
      data: {
        weekId,
        league: placement.league,
        groupNumber: (cohorts.at(-1)?.groupNumber ?? 0) + 1,
      },
      select: { id: true, groupNumber: true, _count: { select: { memberships: true } } },
    });
  }

  await transaction.beaconLeagueMembership.create({
    data: {
      weekId,
      cohortId: cohort.id,
      userId,
      league: placement.league,
      previousLeague: placement.previousLeague,
      crownAward: placement.crowns,
    },
  });
  if (placement.crowns > 0) {
    await transaction.userProfile.update({
      where: { userId },
      data: { beaconCrowns: { increment: placement.crowns } },
    });
  }

  return placement.league;
}

/** Repository boundary for permanent and weekly Beacon progression writes. */
export const beaconRepository = {
  /** Reads current placement without creating competition records. */
  async getCurrentMembership(userId: string, at: Date): Promise<{
    weekId: string;
    startsAt: Date;
    endsAt: Date;
    cohortId: string;
    league: BeaconLeague;
  } | null> {
    const { startsAt } = getBeaconWeekWindow(at);
    const membership = await prisma.beaconLeagueMembership.findFirst({
      where: { userId, week: { startsAt } },
      select: {
        cohortId: true,
        league: true,
        week: { select: { id: true, startsAt: true, endsAt: true } },
      },
    });
    if (!membership) return null;

    return {
      weekId: membership.week.id,
      startsAt: membership.week.startsAt,
      endsAt: membership.week.endsAt,
      cohortId: membership.cohortId,
      league: membership.league,
    };
  },

  /** Ensures a learner has one current weekly cohort before the board renders. */
  async ensureCurrentMembership(userId: string, at: Date): Promise<{
    weekId: string;
    startsAt: Date;
    endsAt: Date;
    cohortId: string;
    league: BeaconLeague;
  }> {
    return prisma.$transaction(async (transaction) => {
      const { startsAt, endsAt } = getBeaconWeekWindow(at);
      const week = await transaction.beaconWeek.upsert({
        where: { startsAt },
        update: {},
        create: { startsAt, endsAt },
        select: { id: true, startsAt: true, endsAt: true },
      });
      await ensureMembership(transaction, week.id, startsAt, userId);
      const membership = await transaction.beaconLeagueMembership.findUniqueOrThrow({
        where: { weekId_userId: { weekId: week.id, userId } },
        select: { cohortId: true, league: true },
      });

      return {
        weekId: week.id,
        startsAt: week.startsAt,
        endsAt: week.endsAt,
        cohortId: membership.cohortId,
        league: membership.league,
      };
    });
  },

  /**
   * Awards one trusted completion inside the caller's gameplay transaction.
   * The immutable ledger key and attempt completion share one commit, so retries
   * can never increase lifetime or weekly XP twice.
   */
  async awardInTransaction(
    transaction: Prisma.TransactionClient,
    input: BeaconAwardInput,
  ): Promise<BeaconProgressionResult> {
    // WHY: A learner may finish attempts in separate browser tabs. Serializing
    // all Beacon writes for that learner prevents both transactions from
    // reading the same lifetime total and losing one otherwise-valid award.
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`beacon-award:${input.userId}`})
      )
    `;

    const { startsAt, endsAt } = getBeaconWeekWindow(input.earnedAt);
    const week = await transaction.beaconWeek.upsert({
      where: { startsAt },
      update: {},
      create: { startsAt, endsAt },
      select: { id: true, startsAt: true },
    });
    const league = await ensureMembership(
      transaction,
      week.id,
      week.startsAt,
      input.userId,
    );
    const before = await transaction.userProfile.findUniqueOrThrow({
      where: { userId: input.userId },
      select: { beaconXp: true, beaconLevel: true },
    });

    await transaction.beaconXpLedger.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        earnedAt: input.earnedAt,
      },
    });
    const lifetimeXp = before.beaconXp + input.amount;
    const level = beaconLevelFromXp(lifetimeXp);
    await transaction.userProfile.update({
      where: { userId: input.userId },
      data: { beaconXp: lifetimeXp, beaconLevel: level },
    });
    const weekly = await transaction.beaconWeeklyScore.upsert({
      where: { weekId_userId: { weekId: week.id, userId: input.userId } },
      create: {
        weekId: week.id,
        userId: input.userId,
        points: input.amount,
        modesCompleted: 1,
        waypointsCompleted: input.waypointCompleted ? 1 : 0,
        lastScoredAt: input.earnedAt,
      },
      update: {
        points: { increment: input.amount },
        modesCompleted: { increment: 1 },
        waypointsCompleted: input.waypointCompleted ? { increment: 1 } : undefined,
        lastScoredAt: input.earnedAt,
      },
      select: { points: true },
    });

    return {
      earnedXp: input.amount,
      lifetimeXp,
      previousLevel: before.beaconLevel,
      level,
      leveledUp: level > before.beaconLevel,
      currentLevelStartXp: beaconLevelStartXp(level),
      nextLevelXp: beaconLevelStartXp(level + 1),
      weeklyXp: weekly.points,
      league,
    };
  },
} as const;
