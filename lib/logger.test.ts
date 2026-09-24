import assert from "node:assert/strict";
import { test } from "node:test";

import { logger } from "@/lib/logger";

/**
 * Verifies the production log boundary without a network or database. The test
 * captures the existing console transport, substitutes representative secrets
 * into errors and structured context, and always restores process-wide state.
 */
test("logger redacts credentials and omits production error stacks", () => {
  const originalEnvironment = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  const capturedEntries: unknown[] = [];

  // WHY: Production error stacks can contain framework and request details
  // that should not be retained by a hosted log sink.
  Reflect.set(process.env, "NODE_ENV", "production");
  console.error = (...entries: unknown[]) => {
    capturedEntries.push(...entries);
  };

  try {
    logger.error(
      "Authentication provider failure.",
      {
        error: new Error(
          "Connection failed password=plain-password token=secret-token " +
            "url=postgresql://db-user:db-password@localhost:51214/app",
        ),
        accessToken: "context-token",
      },
    );
  } finally {
    // WHY: Other tests in this process must observe the environment and console
    // transport that existed before this focused logging-boundary test.
    console.error = originalConsoleError;
    if (originalEnvironment === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", originalEnvironment);
    }
  }

  const serializedEntries = JSON.stringify(capturedEntries);

  assert.match(serializedEntries, /Authentication provider failure/);
  assert.match(serializedEntries, /\[REDACTED\]/);
  assert.doesNotMatch(serializedEntries, /plain-password/);
  assert.doesNotMatch(serializedEntries, /secret-token/);
  assert.doesNotMatch(serializedEntries, /db-password/);
  assert.doesNotMatch(serializedEntries, /context-token/);
  assert.doesNotMatch(serializedEntries, /"stack"/);
});
