import assert from "node:assert/strict";
import test from "node:test";
import { fellowshipCaseFiltersSchema } from "@/features/fellowships/schemas/fellowship-case-filters.schema";

/** Confirms case-register query strings default safely and reject invalid filters. */
test("Fellowship case filters use bounded defaults", () => {
  assert.deepEqual(fellowshipCaseFiltersSchema.parse({}), {
    page: 1,
    query: "",
    kind: "ALL",
    status: "ALL",
  });

  assert.equal(
    fellowshipCaseFiltersSchema.safeParse({ kind: "UNKNOWN" }).success,
    false,
  );
  assert.equal(
    fellowshipCaseFiltersSchema.safeParse({ query: "x".repeat(81) }).success,
    false,
  );
  assert.equal(
    fellowshipCaseFiltersSchema.safeParse({ page: "0" }).success,
    false,
  );

  assert.equal(
    fellowshipCaseFiltersSchema.safeParse({ fellowshipId: "fellowship-123" })
      .success,
    true,
  );
  assert.equal(
    fellowshipCaseFiltersSchema.safeParse({ fellowshipId: "x".repeat(65) })
      .success,
    false,
  );
});
