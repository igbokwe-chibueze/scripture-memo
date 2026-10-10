import assert from "node:assert/strict";
import test from "node:test";
import { BRAND_THEMES } from "@/features/brand-themes/constants/brand-themes";
import { updateActiveBrandThemeSchema } from "@/features/brand-themes/schemas/update-active-brand-theme.schema";

test("accepts the registered Tropical Teal theme", () => {
  assert.deepEqual(
    updateActiveBrandThemeSchema.safeParse({ themeId: "tropical-teal" })
      .success,
    true,
  );
});

test("accepts every theme currently registered for Super Admin selection", () => {
  for (const theme of BRAND_THEMES) {
    assert.equal(
      updateActiveBrandThemeSchema.safeParse({ themeId: theme.id }).success,
      true,
      `${theme.name} should be selectable after registration.`,
    );
  }
});

test("rejects a theme that has not been registered", () => {
  assert.equal(
    updateActiveBrandThemeSchema.safeParse({ themeId: "future-theme" })
      .success,
    false,
  );
});
