/**
 * Prepares an existing Better Auth account for local gameplay testing.
 *
 * Usage:
 *   `npm run local:player -- test@example.com`
 *   `npm run local:player -- test@example.com --admin`
 *   `npm run local:player -- test@example.com --super-admin`
 *
 * Register the account through the application before running this command.
 * This script never creates or changes passwords, sessions, or Better Auth
 * Account records. `--admin` and `--super-admin` grant their exact local roles
 * for authorization testing; omitting both preserves the account's current role.
 * DATABASE_URL must point directly to a loopback PostgreSQL database.
 */
import "dotenv/config";
import { z } from "zod";
import { UserRole } from "@/lib/generated/prisma/enums";
import { createLocalFixtureRepository } from "@/features/dev-fixtures/repositories/local-fixture.repository";

const commandArgumentsSchema = z.object({
  email: z.email(),
  requestedRole: z.enum(UserRole).nullable(),
});

/** Parses the intentionally small command contract without accepting extra flags. */
function parseArguments(argumentsList: string[]): {
  email: string;
  requestedRole: UserRole | null;
} {
  const requestsAdmin = argumentsList.includes("--admin");
  const requestsSuperAdmin = argumentsList.includes("--super-admin");
  if (requestsAdmin && requestsSuperAdmin) {
    throw new Error("Choose either --admin or --super-admin, not both.");
  }

  const unsupportedFlags = argumentsList.filter(
    (argument) =>
      argument.startsWith("--") &&
      argument !== "--admin" &&
      argument !== "--super-admin",
  );
  if (unsupportedFlags.length > 0) {
    throw new Error(`Unsupported option: ${unsupportedFlags[0]}`);
  }

  const emailArguments = argumentsList.filter((argument) => !argument.startsWith("--"));
  return commandArgumentsSchema.parse({
    email: emailArguments[0],
    requestedRole: requestsSuperAdmin
      ? UserRole.SUPER_ADMIN
      : requestsAdmin
        ? UserRole.ADMIN
        : null,
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
      input.requestedRole,
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
