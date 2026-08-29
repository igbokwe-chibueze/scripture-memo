/**
 * Verifies the aggregate result of a local curriculum reset without mutation.
 *
 * Usage: `npm run local:curriculum:verify`
 *
 * DATABASE_URL must target loopback PostgreSQL. The repository returns counts
 * only, so this diagnostic never prints account identity or learner content.
 */
import "dotenv/config";
import { createLocalCurriculumRepository } from "@/features/curriculum/repositories/local-curriculum.repository";

/** Loads and prints aggregate verification evidence. */
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const repository = createLocalCurriculumRepository(process.env.DATABASE_URL);
  try {
    const result = await repository.verifyImport();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await repository.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown verification failure.";
  process.stderr.write(`Curriculum verification failed: ${message}\n`);
  process.exitCode = 1;
});
