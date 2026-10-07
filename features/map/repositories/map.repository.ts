import "server-only";

import { CompletionStatus } from "@/lib/generated/prisma/client";
import { MAP_THEMES } from "@/features/map/data/map-themes";
import { prisma } from "@/lib/prisma";

/**
 * Database boundary for the learner-facing curriculum map.
 *
 * The repository is intentionally read-only. Map selection is a browser display
 * preference, while progression mutations remain owned by the progression
 * repository and its transaction/advisory-lock rules.
 */
export const mapRepository = {
  /**
   * Fetches the complete playable curriculum and one learner's sparse progress.
   *
   * One batched Prisma request avoids an N+1 query per waypoint. Nested progress
   * relations are filtered by the authenticated server-derived user ID, keeping
   * every other learner's private progress out of memory and the response. Only
   * completed day rows are selected because the map needs a flame count, not the
   * private timing/session details used by Day Selection and gameplay.
   *
   * Hidden waypoints and waypoints backed by archived verses are excluded even
   * if stale learner progress exists. The progression engine is responsible for
   * preventing those states; this defensive filter keeps the visible map aligned
   * with the currently playable curriculum.
   */
  async getUserMapData(userId: string) {
    return prisma.waypoint.findMany({
      where: {
        // Published curriculum only; hidden admin placeholders never reach users.
        isActive: true,
        // Published waypoints should already be assigned, but this guards legacy
        // or manually altered data from producing an unusable map node.
        verseId: { not: null },
        // A waypoint is playable only while its assigned verse is also published.
        verse: { isActive: true },
      },
      select: {
        // Select a purpose-built response rather than serializing model records.
        id: true,
        number: true,
        journeyStage: true,
        verse: { select: { reference: true } },
        userProgress: {
          where: { userId },
          select: { status: true },
          take: 1,
        },
        dayProgress: {
          // Three completed rows map directly to the three visible flame states.
          where: { userId, status: CompletionStatus.COMPLETED },
          select: { dayLevel: true },
        },
      },
      // Every grouping and current-node decision depends on curriculum order.
      orderBy: { number: "asc" },
    });
  },

  /**
   * Reads explicit trail-artwork choices in one compact request.
   *
   * Missing rows are intentional and are resolved to the original repeating
   * bundled artwork by the pure map-theme catalogue, so ordinary map reads do
   * not create rows or perform initialization writes.
   */
  async getTrailThemeAssignments(): Promise<
    Array<{ trailNumber: number; themeId: string }>
  > {
    return prisma.mapTrailArtwork.findMany({
      select: { trailNumber: true, themeId: true },
      orderBy: { trailNumber: "asc" },
    });
  },

  /**
   * Loads the published trail ranges and their explicit artwork for the admin
   * picker. Waypoint and assignment reads are batched in parallel and neither
   * query loads learner progress or verse content.
   */
  async getAdminTrailArtworkData(): Promise<{
    waypointNumbers: number[];
    artworkAssignments: Array<{ trailNumber: number; themeId: string }>;
  }> {
    const [waypoints, artworkAssignments] = await Promise.all([
      prisma.waypoint.findMany({
        where: {
          isActive: true,
          verseId: { not: null },
          verse: { isActive: true },
        },
        select: { number: true },
        orderBy: { number: "asc" },
      }),
      prisma.mapTrailArtwork.findMany({
        select: { trailNumber: true, themeId: true },
        orderBy: { trailNumber: "asc" },
      }),
    ]);

    return {
      waypointNumbers: waypoints.map(({ number }) => number),
      artworkAssignments,
    };
  },

  /**
   * Assigns one allow-listed built-in theme or returns the trail to the default sequence.
   *
   * The action validates the same catalogue before reaching this boundary, and
   * the repository repeats the membership check so no future caller can store
   * an arbitrary remote URL or public-file path by mistake.
   */
  async setTrailArtwork(
    trailNumber: number,
    themeId: string | null,
  ): Promise<void> {
    if (themeId === null) {
      // Deletion is idempotent: a trail with no row already uses the sequence.
      await prisma.mapTrailArtwork.deleteMany({ where: { trailNumber } });
      return;
    }

    if (!MAP_THEMES.some((theme) => theme.id === themeId)) {
      throw new Error("Unsupported trail artwork selection.");
    }

    await prisma.mapTrailArtwork.upsert({
      where: { trailNumber },
      create: { trailNumber, themeId },
      update: { themeId },
    });
  },
} as const;
