import assert from "node:assert/strict";
import test from "node:test";
import { getSafePlatformSettingsSummary } from "@/features/audit-logs/lib/safe-audit-summary";

/**
 * These pure tests prove that the audit UI receives only explicit settings
 * fields, even when persisted JSON contains additional sensitive metadata.
 */
test("summarizes only allowlisted platform setting changes", () => {
  const summary = getSafePlatformSettingsSummary({
    previous: {
      defaultTranslation: "KJV",
      baseGlowPoints: 100,
      email: "private@example.test",
    },
    next: {
      defaultTranslation: "WEB",
      baseGlowPoints: 100,
      ipAddress: "192.0.2.1",
    },
  });

  assert.equal(summary, "Default translation: KJV → WEB");
  assert.equal(summary?.includes("private@example.test"), false);
  assert.equal(summary?.includes("192.0.2.1"), false);
});

test("omits malformed, empty, and unrelated event metadata", () => {
  assert.equal(getSafePlatformSettingsSummary(null), null);
  assert.equal(getSafePlatformSettingsSummary({ previous: [], next: {} }), null);
  assert.equal(
    getSafePlatformSettingsSummary({
      previous: { privateValue: "secret" },
      next: { privateValue: "changed" },
    }),
    null,
  );
});
