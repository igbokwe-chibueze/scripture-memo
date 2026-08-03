/**
 * Localization contract tests.
 *
 * Run with `npm run test:i18n` whenever a locale or message is added. The tests
 * protect two assumptions: browser language detection never produces an
 * unsupported locale, and every shipped locale contains the same message keys.
 * Message values are intentionally not compared because translations should be
 * free to use natural grammar rather than mirror English wording.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { localeFromAcceptLanguage, SUPPORTED_LOCALES } from "./config";

/** Flattens nested message objects so missing leaves are reported precisely. */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("browser language detection respects supported Spanish variants", () => {
  assert.equal(localeFromAcceptLanguage("es-MX,es;q=0.9,en;q=0.7"), "es");
  assert.equal(localeFromAcceptLanguage("fr-FR,en;q=0.8"), "en");
  assert.equal(localeFromAcceptLanguage(null), "en");
});

test("all shipped locale files expose the English message contract", async () => {
  const directory = fileURLToPath(new URL("../messages/", import.meta.url));
  const load = async (locale: string): Promise<unknown> =>
    JSON.parse(await readFile(`${directory}${locale}.json`, "utf8")) as unknown;
  const expected = flattenKeys(await load("en")).sort();

  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(flattenKeys(await load(locale)).sort(), expected, `${locale}.json is missing or adds message keys`);
  }
});
