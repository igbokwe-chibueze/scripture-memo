/**
 * Replaces the local curriculum with the owner-approved 100-verse dataset.
 *
 * Usage:
 *   `npm run local:curriculum:reset -- --confirm=RESET-CURRICULUM`
 *
 * Preconditions:
 * - Run `npm run curriculum:build` after changing either source document.
 * - DATABASE_URL must point to loopback PostgreSQL; hosted databases are refused.
 * - The explicit confirmation token prevents an accidental invocation.
 *
 * Side effects:
 * - Writes a timestamped JSON snapshot under `.local-backups/` before mutation.
 * - Deletes learner progress and the old curriculum.
 * - Preserves Better Auth accounts, roles, profiles/settings identity, purchased
 *   hints, notifications, and fellowship membership.
 * - Imports 100 active verses, 400 active waypoints, and unlocks waypoint 1 for
 *   every preserved account.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import curriculumJson from "@/prisma/data/curriculum.json";
import { createLocalCurriculumRepository } from "@/features/curriculum/repositories/local-curriculum.repository";
import type { CurriculumData } from "@/features/curriculum/types/curriculum-data.types";

const REQUIRED_CONFIRMATION = "--confirm=RESET-CURRICULUM";

/** Performs inexpensive shape checks before any backup or database write. */
function validateCurriculum(input: CurriculumData): void {
  if (input.verses.length !== 100) {
    throw new Error(`Expected 100 verses; received ${input.verses.length}.`);
  }
  if (input.waypoints.length !== 400) {
    throw new Error(`Expected 400 waypoints; received ${input.waypoints.length}.`);
  }
  const numbers = input.waypoints.map(({ number }) => number).sort((a, b) => a - b);
  if (numbers.some((number, index) => number !== index + 1)) {
    throw new Error("Waypoint numbers must be unique and contiguous from 1 to 400.");
  }
}

/** Creates a filesystem-safe timestamp without relying on locale formatting. */
function backupTimestamp(): string {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

/** Coordinates guarded backup, reset, and concise non-sensitive reporting. */
async function main(): Promise<void> {
  if (!process.argv.slice(2).includes(REQUIRED_CONFIRMATION)) {
    throw new Error(`Explicit confirmation is required: ${REQUIRED_CONFIRMATION}`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const curriculum = curriculumJson as CurriculumData;
  validateCurriculum(curriculum);
  const repository = createLocalCurriculumRepository(process.env.DATABASE_URL);

  try {
    const snapshot = await repository.createBackupSnapshot();
    const backupDirectory = path.join(process.cwd(), ".local-backups");
    const backupPath = path.join(
      backupDirectory,
      `curriculum-reset-${backupTimestamp()}.json`,
    );
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(backupPath, JSON.stringify(snapshot, null, 2), "utf8");

    const summary = await repository.resetAndImport(curriculum);
    process.stdout.write(
      [
        `Backup written to ${backupPath}.`,
        `Preserved ${summary.usersPreserved} accounts.`,
        `Created ${summary.versesCreated} active verses,`,
        `${summary.waypointsCreated} active waypoints,`,
        `and ${summary.studyGuidesCreated} formatted study guides.`,
      ].join(" ") + "\n",
    );
  } finally {
    await repository.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown curriculum reset failure.";
  process.stderr.write(`Local curriculum reset failed: ${message}\n`);
  process.exitCode = 1;
});
