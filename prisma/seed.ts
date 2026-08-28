/**
 * Scripture Memo database seed.
 *
 * Run explicitly with `npx prisma db seed` after migrations are applied. Prisma
 * 7 does not run seeds automatically during migrate commands. The script needs
 * DATABASE_URL and the generated Prisma client produced by `prisma generate`.
 *
 * This bootstrap seed installs the approved 100-verse, 400-waypoint curriculum.
 * It is intentionally idempotent: existing verses and waypoint numbers are never
 * updated, so rerunning it cannot overwrite permanent learner history.
 *
 * The repository owns all database access and closes its short-lived connection
 * pool in `finally`. Any failure exits non-zero, allowing deployment or local
 * setup automation to stop safely instead of assuming a partial seed succeeded.
 */
import {
  disconnectCurriculumSeedRepository,
  seedCurriculumCatalog,
} from "@/features/curriculum/repositories/curriculum-seed.repository";
import curriculumJson from "@/prisma/data/curriculum.json";
import type { CurriculumData } from "@/features/curriculum/types/curriculum-data.types";
import {
  disconnectBadgeSeedRepository,
  seedBadgeCatalog,
} from "@/features/badges/repositories/badge-seed.repository";
import {
  disconnectOilShopSeedRepository,
  seedHintShopCatalog,
} from "@/features/oil-shop/repositories/oil-shop-seed.repository";

/** Runs the idempotent waypoint seed and reports only aggregate, non-sensitive output. */
async function main(): Promise<void> {
  // WHY: Each catalogue repository owns a short-lived PrismaPg client. Running
  // those clients concurrently can collide on unnamed prepared statements in
  // the local Prisma Dev proxy. Sequential bounded calls remain fast, keep the
  // seed deterministic, and avoid retry traffic against any environment.
  const curriculum = await seedCurriculumCatalog(
    curriculumJson as CurriculumData,
  );
  const synchronizedBadges = await seedBadgeCatalog();
  const synchronizedShopItems = await seedHintShopCatalog();
  process.stdout.write(
    `Seed complete: inserted ${curriculum.createdVerses} verses and ${curriculum.createdWaypoints} waypoints, synchronized ${synchronizedBadges} badges and ${synchronizedShopItems} shop items; preserved existing progress.\n`,
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
      disconnectCurriculumSeedRepository(),
      disconnectBadgeSeedRepository(),
      disconnectOilShopSeedRepository(),
    ]);
  }
}

void runSeed();
