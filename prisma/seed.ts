/**
 * Scripture Memo database seed.
 *
 * Run explicitly with `npx prisma db seed` after migrations are applied. Prisma
 * 7 does not run seeds automatically during migrate commands. The script needs
 * DATABASE_URL and the generated Prisma client produced by `prisma generate`.
 *
 * This bootstrap seed creates the initial 220 curriculum slots. The curriculum
 * has no permanent maximum; administrators append later waypoints through the
 * application. The seed is intentionally idempotent: existing numbers are never
 * updated, so rerunning it cannot overwrite verse assignments, Journey Stages,
 * publication state, or learner-related records. Missing placeholders start
 * hidden and unassigned with provisional LEARN stage; that stage has no gameplay
 * effect until an administrator explicitly assigns a verse and publishes the
 * waypoint.
 *
 * The repository owns all database access and closes its short-lived connection
 * pool in `finally`. Any failure exits non-zero, allowing deployment or local
 * setup automation to stop safely instead of assuming a partial seed succeeded.
 */
import { JourneyStage } from "@/lib/generated/prisma/enums";
import {
  disconnectWaypointSeedRepository,
  seedWaypointPlaceholders,
} from "@/features/waypoints/repositories/waypoint-seed.repository";
import type { WaypointSeedData } from "@/features/waypoints/types/waypoint.types";
import {
  disconnectBadgeSeedRepository,
  seedBadgeCatalog,
} from "@/features/badges/repositories/badge-seed.repository";
import {
  disconnectOilShopSeedRepository,
  seedHintShopCatalog,
} from "@/features/oil-shop/repositories/oil-shop-seed.repository";

const WAYPOINT_COUNT = 220;

/** Builds the initial slot numbers without storing mutable curriculum in JSON. */
function buildWaypointPlaceholders(): WaypointSeedData[] {
  return Array.from({ length: WAYPOINT_COUNT }, (_, index) => ({
    number: index + 1,
    journeyStage: JourneyStage.LEARN,
    isActive: false,
  }));
}

/** Runs the idempotent waypoint seed and reports only aggregate, non-sensitive output. */
async function main(): Promise<void> {
  // WHY: Each catalogue repository owns a short-lived PrismaPg client. Running
  // those clients concurrently can collide on unnamed prepared statements in
  // the local Prisma Dev proxy. Sequential bounded calls remain fast, keep the
  // seed deterministic, and avoid retry traffic against any environment.
  const insertedCount = await seedWaypointPlaceholders(
    buildWaypointPlaceholders(),
  );
  const synchronizedBadges = await seedBadgeCatalog();
  const synchronizedShopItems = await seedHintShopCatalog();
  process.stdout.write(
    `Seed complete: inserted ${insertedCount} waypoints, synchronized ${synchronizedBadges} badges and ${synchronizedShopItems} shop items; preserved existing progress.\n`,
  );
}

/**
 * Provides CommonJS-compatible async orchestration because this repository does
 * not declare ESM package mode. Cleanup still runs after every outcome, and a
 * cleanup error also produces a non-zero process result.
 */
async function runSeed(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown seed failure.";
    const errorCode = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "unclassified";
    process.stderr.write(`Waypoint seed failed (${errorCode}): ${message}\n`);
    process.exitCode = 1;
  } finally {
    await Promise.all([
      disconnectWaypointSeedRepository(),
      disconnectBadgeSeedRepository(),
      disconnectOilShopSeedRepository(),
    ]);
  }
}

void runSeed();
