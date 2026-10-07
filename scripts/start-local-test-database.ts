/**
 * Start the persistent integration-only instance with the installed Prisma Local
 * runtime. No CLI download, cloud provisioning, migration, seed, or reset occurs.
 * Keep this process running during tests. Fixed ports and a distinct storage name
 * isolate test fixtures from the application instance on port 51214.
 */
import { startPrismaDevServer } from "@prisma/dev";

/** Bind test ports and close the persisted database cleanly on terminal signals. */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local test services are disabled in production.");
  }
  const server = await startPrismaDevServer({
    name: "scripture-memo-tests",
    persistenceMode: "stateful",
    port: 51223,
    databasePort: 51224,
    shadowDatabasePort: 51225,
  });
  console.log("Local integration database ready on localhost:51224 (scripture-memo-tests).");
  let closing = false;
  const close = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void close());
  process.once("SIGTERM", () => void close());
}

void main().catch(() => {
  // Do not print runtime errors that could contain connection credentials.
  console.error("Could not start local tests. Check whether ports 51223–51225 are in use.");
  process.exitCode = 1;
});
