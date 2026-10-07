/**
 * Apply checked-in migrations only to the confirmed local integration instance.
 * The guard rejects hosted URLs, production, and the application listener before
 * launching Prisma. No reset or seed runs; migration failure exits nonzero.
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { requireSafeTestDatabaseUrl } from "../lib/testing/test-database-guard";

const databaseUrl = requireSafeTestDatabaseUrl({
  applicationDatabaseUrl: process.env.DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  confirmation: process.env.TEST_DATABASE_CONFIRMATION,
});

// Scope the URL override to the child. prisma.config.ts reads DATABASE_URL and
// dotenv preserves inherited values, so the application's .env stays unchanged.
const child = spawn(process.execPath, [
  resolve("node_modules/prisma/build/index.js"),
  "migrate",
  "deploy",
], {
  shell: false,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    TEST_DIRECT_URL: databaseUrl,
  },
});
child.once("error", () => {
  console.error("Could not launch the installed Prisma migration command.");
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
