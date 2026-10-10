/**
 * Run every non-database TypeScript test file in one bounded Node test process.
 *
 * Use `npm run test:unit` locally and in GitHub Actions. Keeping this file list
 * derived from the feature folders means a new pure unit test is automatically
 * part of the standard check instead of silently being omitted from CI.
 *
 * Inputs and assumptions:
 * - Node.js 22 or newer and the repository's installed `tsx` development tool.
 * - Test source lives in `features/`, `lib/`, or `i18n/` and uses `.test.ts` or
 *   `.test.tsx` naming.
 * - Repository tests and tests explicitly named `.integration.test.*` need a
 *   real database. They are excluded here and run by dedicated database jobs.
 * - The project is not in production mode. This runner does not create, migrate,
 *   reset, connect to, or seed any database.
 *
 * The Node test worker limit prevents a large CPU-count runner from launching
 * every unit file at once. `react-server` is passed both to tsx and inherited
 * workers because a few server-only modules are covered by pure unit tests.
 * The child process uses an argument array and `shell: false`, so discovered
 * file names are never interpreted as shell code. Any failure or interruption
 * returns a nonzero status for local callers and CI.
 */
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { relative, resolve } from "node:path";

const TEST_ROOTS = ["features", "lib", "i18n"] as const;
const TEST_FILE_EXTENSIONS = [".test.ts", ".test.tsx"] as const;
const DATABASE_TEST_DIRECTORY = "repositories";
const DATABASE_TEST_SUFFIX = ".integration.test.";
const TEST_WORKER_LIMIT = "2";

/**
 * Recursively collect candidate test files from only the app's maintained test
 * roots; this avoids scanning dependencies, build output, or generated files.
 */
async function findTestFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedResults = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        return findTestFiles(entryPath);
      }

      if (
        entry.isFile() &&
        TEST_FILE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))
      ) {
        return [entryPath];
      }

      return [];
    }),
  );

  return nestedResults.flat();
}

/**
 * Exclude every repository test (even those without an integration suffix) and
 * explicitly marked integration tests so unit CI never depends on a database.
 */
function isDatabaseTest(filePath: string): boolean {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const pathParts = normalizedPath.split("/");
  const fileName = pathParts.at(-1) ?? "";

  return pathParts.includes(DATABASE_TEST_DIRECTORY) ||
    fileName.includes(DATABASE_TEST_SUFFIX);
}

/**
 * Start the TypeScript test runner without a shell and preserve its exit code.
 * The only environment change is ensuring all Node test workers resolve the
 * `server-only` package through React's server export condition.
 */
async function runTestProcess(testFiles: string[]): Promise<void> {
  const tsxCliPath = resolve("node_modules/tsx/dist/cli.mjs");
  const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
  const hasServerCondition = existingNodeOptions
    ?.split(/\s+/)
    .includes("--conditions=react-server") ?? false;
  const nodeOptions = hasServerCondition
    ? existingNodeOptions
    : [existingNodeOptions, "--conditions=react-server"].filter(Boolean).join(" ");
  const relativeTestPaths = testFiles
    .map((filePath) => relative(process.cwd(), filePath))
    .map((filePath) => filePath.replaceAll("\\", "/"));

  await new Promise<void>((resolveProcess, rejectProcess) => {
    const child = spawn(
      process.execPath,
      [
        tsxCliPath,
        "--conditions=react-server",
        "--test",
        `--test-concurrency=${TEST_WORKER_LIMIT}`,
        ...relativeTestPaths,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_OPTIONS: nodeOptions,
        },
        shell: false,
        stdio: "inherit",
      },
    );

    child.once("error", () => {
      rejectProcess(new Error("Could not start the TypeScript unit-test runner."));
    });

    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveProcess();
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
      rejectProcess(new Error(`The unit-test runner failed with ${reason}.`));
    });
  });
}

/** Discover and run the full database-free suite, failing clearly if empty. */
async function runUnitTests(): Promise<void> {
  const discoveredFiles = (
    await Promise.all(TEST_ROOTS.map((root) => findTestFiles(resolve(root))))
  ).flat();
  const unitTestFiles = discoveredFiles
    .filter((filePath) => !isDatabaseTest(filePath))
    .sort();

  if (unitTestFiles.length === 0) {
    throw new Error("No database-free unit tests were found in the configured test roots.");
  }

  console.info(`Running ${unitTestFiles.length} database-free TypeScript test files.`);
  await runTestProcess(unitTestFiles);
}

runUnitTests().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : "Unknown unit-test runner failure.";
  console.error(message);
  process.exitCode = 1;
});
