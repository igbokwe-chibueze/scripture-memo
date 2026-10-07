/**
 * Run the repository's PostgreSQL concurrency integration suites against a
 * disposable, real PostgreSQL server without Docker or an installed service.
 *
 * Use `npm run test:concurrency:local` when validating database advisory locks,
 * transaction races, or shared database-backed rate limits. The runner starts
 * an embedded PostgreSQL 16 server on an available loopback port, creates an
 * empty test database, applies only checked-in migrations, runs the existing
 * guarded concurrency suites, then stops PostgreSQL and removes its temporary
 * data directory.
 *
 * Required inputs are the project's normal local `DATABASE_URL` (loaded from
 * `.env` or the process environment) and the installed `embedded-postgres`
 * development dependency. The development URL is read only so the established
 * test guard can confirm the disposable test server uses a different local
 * port. The runner never replaces or writes `.env`, and it refuses production
 * mode or a non-loopback development URL before starting any database process.
 *
 * Safety decisions:
 * - A fresh random database password and temporary data path are created for
 *   each run, and PostgreSQL listens only on 127.0.0.1.
 * - `persistent: false` makes the embedded server delete its data directory
 *   during shutdown. A second cleanup removes only the unique directory created
 *   under the operating system temp directory by this process.
 * - The migration child process still uses the shared local-only test database
 *   guard. It rejects hosted URLs and reusing the development database port.
 * - Migration or test failure stops the run with a nonzero status, while the
 *   `finally` block still shuts down PostgreSQL and cleans up temporary files.
 *
 * The PostgreSQL server binaries are supplied by the pinned dev-only package;
 * no host service, Prisma Local instance, production database, or Cloud resource
 * is installed, started, or changed by this script.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { requireSafeTestDatabaseUrl } from "../lib/testing/test-database-guard";

const TEMPORARY_DIRECTORY_PREFIX = "scripture-memo-concurrency-";
const TEST_DATABASE_NAME = "scripture_memo_concurrency_tests";
const TEST_DATABASE_USER = "scripture_memo_concurrency";
const TEST_DATABASE_CONFIRMATION = "scripture-memo-integration-tests";

const CONCURRENCY_TEST_FILES = [
  "features/auth/repositories/auth.repository.test.ts",
  "features/progression/repositories/progression.repository.test.ts",
  "features/gameplay/repositories/gameplay-submission-limit.repository.test.ts",
  "features/gameplay/repositories/gameplay-completion-concurrency.repository.test.ts",
  "features/fellowships/repositories/fellowship-governance-concurrency.repository.test.ts",
] as const;

/** Reserve an ephemeral loopback port so the test server never assumes 5432. */
async function findAvailableLoopbackPort(): Promise<number> {
  const server = createServer();

  return new Promise<number>((resolvePort, rejectPort) => {
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        rejectPort(new Error("Could not reserve a local PostgreSQL test port."));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          rejectPort(error);
          return;
        }
        resolvePort(port);
      });
    });
  });
}

/** Start one local child command and return failure details without leaking env. */
async function runNodeScript(
  label: string,
  scriptArguments: string[],
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  const tsxCliPath = resolve("node_modules/tsx/dist/cli.mjs");

  await new Promise<void>((resolveCommand, rejectCommand) => {
    const child = spawn(
      process.execPath,
      [tsxCliPath, ...scriptArguments],
      {
        cwd: process.cwd(),
        env: environment,
        shell: false,
        stdio: "inherit",
      },
    );

    child.once("error", () => {
      rejectCommand(new Error(`Could not start ${label}.`));
    });

    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveCommand();
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
      rejectCommand(new Error(`${label} failed with ${reason}.`));
    });
  });
}

/** Confirm the disposable data path is the exact temp directory we created. */
function assertOwnedTemporaryDirectory(path: string): void {
  const resolvedPath = resolve(path);
  const resolvedTempRoot = resolve(tmpdir());
  const sameTemporaryRoot = process.platform === "win32"
    ? dirname(resolvedPath).toLowerCase() === resolvedTempRoot.toLowerCase()
    : dirname(resolvedPath) === resolvedTempRoot;

  if (
    !sameTemporaryRoot ||
    !basename(resolvedPath).startsWith(TEMPORARY_DIRECTORY_PREFIX)
  ) {
    throw new Error("Refusing to clean a path not created for this test run.");
  }
}

/** Retry only transient Windows filesystem locks on this disposable path. */
async function removeOwnedTemporaryDirectory(path: string): Promise<void> {
  assertOwnedTemporaryDirectory(path);

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : undefined;
      const isTransientWindowsLock =
        process.platform === "win32" &&
        ["EBUSY", "EPERM", "ENOTEMPTY"].includes(errorCode ?? "");

      if (!isTransientWindowsLock || attempt === 6) {
        throw error;
      }

      // PostgreSQL exits before Windows releases every file handle. A short
      // bounded retry handles antivirus/indexer delays without hiding failure.
      await new Promise<void>((resolveDelay) => {
        setTimeout(resolveDelay, attempt * 250);
      });
    }
  }
}

/** Run migrations and concurrency tests on the disposable local server. */
async function runLocalConcurrencyTests(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local concurrency tests cannot run in production mode.");
  }

  const applicationDatabaseUrl = process.env.DATABASE_URL;
  if (!applicationDatabaseUrl) {
    throw new Error("Set the local development DATABASE_URL before testing.");
  }

  const applicationUrl = new URL(applicationDatabaseUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(applicationUrl.hostname)
  ) {
    throw new Error("The application DATABASE_URL must point to a local database.");
  }

  const port = await findAvailableLoopbackPort();
  const databasePassword = randomBytes(32).toString("hex");
  const testDatabaseUrl = new URL(
    `postgresql://${encodeURIComponent(TEST_DATABASE_USER)}:${databasePassword}` +
      `@127.0.0.1:${port}/${TEST_DATABASE_NAME}?sslmode=disable`,
  ).href;

  // Reuse the project guard before a server is started or a migration is sent.
  // This proves the test listener differs from the application listener and
  // rejects remote database URLs even though this runner creates its own URL.
  requireSafeTestDatabaseUrl({
    applicationDatabaseUrl,
    confirmation: TEST_DATABASE_CONFIRMATION,
    testDatabaseUrl,
  });

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), TEMPORARY_DIRECTORY_PREFIX),
  );
  const databaseDirectory = join(temporaryDirectory, "postgres-data");
  const postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: TEST_DATABASE_USER,
    password: databasePassword,
    port,
    // Keep the library from deleting files inside its own `stop()` call; the
    // guarded cleanup below retries Windows file-lock delays explicitly.
    persistent: true,
    postgresFlags: [
      "-c",
      "listen_addresses=127.0.0.1",
      "-c",
      "max_connections=32",
    ],
    onLog: () => undefined,
    onError: () => {
      console.error("The temporary PostgreSQL test server reported an error.");
    },
  });

  let serverStarted = false;
  let serverStopped = true;
  let runError: unknown;

  try {
    console.info("Preparing a disposable local PostgreSQL concurrency test database…");
    await postgres.initialise();
    await postgres.start();
    serverStarted = true;
    serverStopped = false;
    await postgres.createDatabase(TEST_DATABASE_NAME);

    const testEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      // Node's test runner starts worker processes. NODE_OPTIONS carries the
      // React Server Component export condition into those workers as well as
      // the initial tsx process, so `server-only` resolves to its server entry.
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS,
        "--conditions=react-server",
      ].filter(Boolean).join(" "),
      TEST_DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_CONFIRMATION,
    };

    console.info("Applying checked-in migrations to the disposable test database…");
    await runNodeScript(
      "the test database migration command",
      ["scripts/migrate-local-test-database.ts"],
      testEnvironment,
    );

    for (const testFile of CONCURRENCY_TEST_FILES) {
      console.info(`Running ${testFile}…`);
      await runNodeScript(
        testFile,
        ["--test", testFile],
        testEnvironment,
      );
    }

    console.info("All local PostgreSQL concurrency integration suites passed.");
  } catch (error) {
    runError = error;
  } finally {
    // Remove only the unique generated directory in the OS temp root. The
    // bounded retry handles Windows releasing server-owned files after exit.
    let cleanupError: unknown;
    try {
      if (serverStarted) {
        await postgres.stop();
      }
      serverStopped = true;
    } catch (stopError) {
      cleanupError = stopError;
    }

    if (serverStopped) {
      try {
        await removeOwnedTemporaryDirectory(temporaryDirectory);
      } catch (error) {
        cleanupError ??= error;
      }
    } else {
      console.error(
        "Leaving the temporary database directory in place because the server did not stop cleanly.",
      );
    }

    if (cleanupError) {
      if (runError) {
        console.error("The test run failed and temporary database cleanup also failed.");
      } else {
        runError = cleanupError;
      }
    }
  }

  if (runError) {
    throw runError;
  }
}

runLocalConcurrencyTests().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : "Unknown local PostgreSQL concurrency test failure.";
  console.error(`Local concurrency tests failed: ${message}`);
  process.exitCode = 1;
});
