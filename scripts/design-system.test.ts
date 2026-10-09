/**
 * Verifies the shared design-system contract without starting the application.
 *
 * Run this test after changing app/globals.css or migrating component colors.
 * It reads source files in `app`, `components`, and `features`; no database,
 * external service, browser, generated assets, or environment variables are
 * required. The test protects both semantic token coverage and the narrow list
 * of source files allowed to contain artwork or email-client color literals.
 *
 * The small OKLCH conversion below exists only to verify the contrast claims in
 * the approved design brief. It supports the static `oklch(L C H)` colors used
 * by the token pairs under test. It intentionally rejects unsupported color
 * expressions instead of guessing at their rendered value.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const stylesheetPath = path.join(repositoryRoot, "app", "globals.css");
const stylesheet = readFileSync(stylesheetPath, "utf8");

type CssVariables = ReadonlyMap<string, string>;
type RgbColor = readonly [number, number, number];

const CORE_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "primary-hover",
  "primary-pressed",
  "primary-edge",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "ring",
  "link",
  "disabled",
  "disabled-foreground",
  "control-edge",
  "overlay",
  "image-overlay",
] as const;

const SEMANTIC_ROLES = [
  "success",
  "error",
  "warning",
  "info",
  "reward",
  "selection",
  "available",
  "decoration",
] as const;

/**
 * These exact files retain direct colors for the documented asset or output
 * format exception. A directory-wide or feature-wide exemption would hide
 * ordinary interface drift and is therefore not permitted here.
 */
const APPROVED_COLOR_EXCEPTION_PATHS = new Set([
  "features/profile/components/player-avatar.tsx",
  "features/gameplay/components/animated-flame.tsx",
  "features/auth/lib/email-verification-delivery.ts",
  "features/auth/lib/password-reset-production-delivery.ts",
]);

/** Flattens only CSS declarations directly inside a simple selector block. */
function readVariableBlock(selector: string): Map<string, string> {
  const blockMatch = stylesheet.match(
    new RegExp(`${selector}\\s*\\{([^}]+)\\}`),
  );
  assert.ok(blockMatch, `Expected stylesheet block ${selector}.`);

  const variables = new Map<string, string>();
  for (const match of blockMatch[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    variables.set(match[1], match[2].trim());
  }
  return variables;
}

/** Reads all ordinary source files without descending into generated output. */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    if (!/\.(?:tsx?|css)$/.test(entry.name)) return [];
    return [entryPath];
  });
}

/** Resolves a semantic variable, including aliases such as selection -> primary. */
function resolveVariable(
  variables: CssVariables,
  token: string,
  visited = new Set<string>(),
): string {
  assert.ok(!visited.has(token), `Circular CSS token alias: ${token}.`);
  visited.add(token);

  const value = variables.get(token);
  assert.ok(value, `Missing CSS token --${token}.`);
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  if (alias) return resolveVariable(variables, alias[1], visited);
  return value;
}

/** Converts a static OKLCH token to its sRGB equivalent for contrast checks. */
function oklchToRgb(value: string, tokenName: string): RgbColor {
  const match = value.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/,
  );
  assert.ok(match, `Expected --${tokenName} to be a static OKLCH value.`);

  const lightness = Number(match[1]);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Converts one linear RGB channel to the encoded sRGB range. */
function linearToSrgb(channel: number): number {
  const bounded = Math.min(1, Math.max(0, channel));
  if (bounded <= 0.0031308) return 12.92 * bounded;
  return 1.055 * bounded ** (1 / 2.4) - 0.055;
}

/** Computes WCAG contrast for two already-composited sRGB colors. */
function contrastRatio(first: RgbColor, second: RgbColor): number {
  const luminance = (color: RgbColor): number => {
    const [red, green, blue] = color.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Collects app-owned source files used by the raw-color guard. */
const applicationSourceFiles = ["app", "components", "features"].flatMap(
  (directory) => sourceFiles(path.join(repositoryRoot, directory)),
);

test("core and semantic color tokens exist in both themes and Tailwind", () => {
  const lightTheme = readVariableBlock(":root");
  const darkTheme = readVariableBlock("\\.dark");
  const inlineThemeMatch = stylesheet.match(/@theme inline\s*\{([^}]+)\}/);
  assert.ok(inlineThemeMatch, "Expected one Tailwind inline theme block.");
  const inlineTheme = inlineThemeMatch[1];

  const allTokens = [
    ...CORE_TOKENS,
    ...SEMANTIC_ROLES.flatMap((role) => [
      role,
      `${role}-foreground`,
      `${role}-subtle`,
      `${role}-text`,
      `${role}-border`,
    ]),
  ];

  for (const token of allTokens) {
    assert.ok(lightTheme.has(token), `Light theme is missing --${token}.`);
    assert.ok(darkTheme.has(token), `Dark theme is missing --${token}.`);
    assert.match(
      inlineTheme,
      new RegExp(`--color-${token}:\\s*var\\(--${token}\\)`),
      `Tailwind theme is missing the --color-${token} mapping.`,
    );
  }
});

test("semantic text pairs meet the documented WCAG AA contrast target", () => {
  const themes = [
    { name: "light", variables: readVariableBlock(":root") },
    { name: "dark", variables: readVariableBlock("\\.dark") },
  ] as const;

  for (const { name, variables } of themes) {
    const textPairs = [
      ["background", "foreground"],
      ["card", "card-foreground"],
      ["primary", "primary-foreground"],
      ...SEMANTIC_ROLES.map((role) => [role, `${role}-foreground`]),
      ...SEMANTIC_ROLES.map((role) => [`${role}-subtle`, `${role}-text`]),
    ] as const;

    for (const [surfaceToken, textToken] of textPairs) {
      const surface = oklchToRgb(
        resolveVariable(variables, surfaceToken),
        surfaceToken,
      );
      const text = oklchToRgb(resolveVariable(variables, textToken), textToken);
      const ratio = contrastRatio(surface, text);
      assert.ok(
        ratio >= 4.5,
        `${name} theme ${textToken} on ${surfaceToken} has contrast ${ratio.toFixed(2)}:1; expected at least 4.5:1.`,
      );
    }
  }
});

test("application UI has no unapproved raw palette classes or literal colors", () => {
  const rawPaletteUtility =
    /(?:^|[\s"'`])(?:[\w-]+:)*(?:bg|text|border|ring|fill|stroke|shadow|from|via|to|outline)-(?:amber|orange|violet|purple|blue|green|red|emerald|sky|pink|yellow|rose|teal|cyan|indigo|lime|slate|gray|neutral|stone|white|black)(?:-\d{2,3})?(?:\/\d{1,3})?!?(?=$|[\s"'`])/g;
  const arbitraryLiteralColor =
    /(?:bg|text|border|ring|fill|stroke|shadow|from|via|to)-\[[^\]]*(?:#[\da-f]{3,8}\b|rgba?\(|hsla?\(|oklch\()/gi;
  const inlineColorDeclaration =
    /style=\{\{[\s\S]*?\b(?:color|backgroundColor|borderColor|outlineColor|fill|stroke)\s*:/;

  const violations: string[] = [];
  for (const filePath of applicationSourceFiles) {
    const relativePath = path.relative(repositoryRoot, filePath).replaceAll("\\", "/");
    if (APPROVED_COLOR_EXCEPTION_PATHS.has(relativePath)) continue;

    const source = readFileSync(filePath, "utf8");
    if (
      rawPaletteUtility.test(source) ||
      arbitraryLiteralColor.test(source) ||
      inlineColorDeclaration.test(source) ||
      /#[\da-f]{3,8}\b/i.test(source) ||
      /rgba?\(/i.test(source)
    ) {
      violations.push(relativePath);
    }
    rawPaletteUtility.lastIndex = 0;
    arbitraryLiteralColor.lastIndex = 0;
  }

  assert.deepEqual(
    violations,
    [],
    `Replace direct interface colors with semantic tokens or add a narrow documented exception:\n${violations.join("\n")}`,
  );
});

test("Fredoka uses only locally supplied medium and bold weights", () => {
  const violations = applicationSourceFiles.filter((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return /\bfont-(?:semibold|extrabold|black)\b/.test(source);
  });

  assert.deepEqual(violations, []);
});
