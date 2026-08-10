/**
 * Restores one existing local Better Auth account to fresh gameplay progress.
 *
 * Usage:
 *   `npx tsx scripts/reset-local-player-progress.ts player@example.com`
 *
 * Required input and assumptions:
 * - Pass exactly one registered account email.
 * - DATABASE_URL must point to loopback PostgreSQL. The repository rejects any
 *   hosted database before constructing Prisma Client.
 * - This is destructive for gameplay history, rewards, badges, purchased hints,
 *   streaks, Beacon state, and notices. It intentionally preserves credentials,
 *   sessions, role, settings, profile identity, notes, favourites, and groups.
 *
 * Safe failure behavior:
 * - Zod rejects missing, malformed, or extra arguments before database access.
 * - One database transaction either completes the entire reset or changes
 *   nothing. The short-lived Prisma connection is always closed afterward.
 */
import "dotenv/config";
import { z } from "zod";
import { createLocalFixtureRepository } from "@/features/dev-fixtures/repositories/local-fixture.repository";

const resetArgumentsSchema = z.tuple([z.email()]);

/** Validates the deliberately narrow destructive command contract. */
function parseEmail(argumentsList: string[]): string {
  return resetArgumentsSchema.parse(argumentsList)[0];
}

/** Runs the guarded transactional reset and prints only non-sensitive counts. */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const email = parseEmail(process.argv.slice(2));
  const repository = createLocalFixtureRepository(databaseUrl);

  try {
    const result = await repository.resetPlayerProgress(email);
    process.stdout.write(
      [
        `Local progress reset for ${result.email}.`,
        `Waypoint ${result.firstWaypointNumber} is unlocked as the fresh starting point.`,
        `Removed ${result.removedGameSessions} sessions,`,
        `${result.removedDayRecords} day records,`,
        `${result.removedWaypointRecords} waypoint records,`,
        `${result.removedBadgeRecords} badge records,`,
        `and ${result.removedRewardRecords} reward records.`,
      ].join(" ") + "\n",
    );
  } finally {
    await repository.disconnect();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown local progress reset failure.";
  process.stderr.write(`Local progress reset failed: ${message}\n`);
  process.exitCode = 1;
});
