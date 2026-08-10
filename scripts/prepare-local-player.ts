/**
 * Prepares an existing Better Auth account for local gameplay testing.
 *
 * Usage:
 *   `npm run local:player -- test@example.com`
 *   `npm run local:player -- test@example.com --admin`
 *
 * Register the account through the application before running this command.
 * This script never creates or changes passwords, sessions, or Better Auth
 * Account records. `--admin` grants the local ADMIN role for feature testing.
 * DATABASE_URL must point directly to a loopback PostgreSQL database.
 */
import "dotenv/config";
import { z } from "zod";
import { createLocalFixtureRepository } from "@/features/dev-fixtures/repositories/local-fixture.repository";

const commandArgumentsSchema = z.object({
  email: z.email(),
  grantAdminRole: z.boolean(),
});

/** Parses the intentionally small command contract without accepting extra flags. */
function parseArguments(argumentsList: string[]): {
  email: string;
  grantAdminRole: boolean;
} {
  const grantAdminRole = argumentsList.includes("--admin");
  const unsupportedFlags = argumentsList.filter(
    (argument) => argument.startsWith("--") && argument !== "--admin",
  );
  if (unsupportedFlags.length > 0) {
    throw new Error(`Unsupported option: ${unsupportedFlags[0]}`);
  }

  const emailArguments = argumentsList.filter((argument) => !argument.startsWith("--"));
  return commandArgumentsSchema.parse({
    email: emailArguments[0],
    grantAdminRole,
  });
}

/** Applies local presentation/progression state after validating all inputs. */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const input = parseArguments(process.argv.slice(2));
  const repository = createLocalFixtureRepository(databaseUrl);
  try {
    const result = await repository.preparePlayer(
      input.email,
      input.grantAdminRole,
    );
    process.stdout.write(
      `Local player ready: ${result.email}, role ${result.role}, waypoint ${result.firstWaypointNumber} unlocked.\n`,
    );
  } finally {
    await repository.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown player setup failure.";
  process.stderr.write(`Local player setup failed: ${message}\n`);
  process.exitCode = 1;
});
