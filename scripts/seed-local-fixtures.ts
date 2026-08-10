/**
 * Seeds a small playable curriculum into Prisma Postgres Local.
 *
 * Usage: `npm run local:fixtures`
 *
 * Required input: DATABASE_URL loaded from the repository `.env` file.
 * The repository refuses non-loopback URLs before opening Prisma Client, so this
 * script cannot intentionally be used to seed hosted, staging, or production
 * databases. It does not create users or credentials and is safe to rerun while
 * the first five fixture waypoints have no learner history.
 */
import "dotenv/config";
import { createLocalFixtureRepository } from "@/features/dev-fixtures/repositories/local-fixture.repository";

/** Runs the guarded fixture and emits only aggregate, non-sensitive results. */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const repository = createLocalFixtureRepository(databaseUrl);
  try {
    const summary = await repository.seedCurriculum();
    process.stdout.write(
      `Local fixtures ready: ${summary.createdVerses} verses created, ${summary.reusedVerses} reused, and ${summary.publishedWaypoints} waypoints published.\n`,
    );
  } finally {
    await repository.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown fixture failure.";
  process.stderr.write(`Local fixture seed failed: ${message}\n`);
  process.exitCode = 1;
});
