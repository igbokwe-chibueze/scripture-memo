import assert from "node:assert/strict";
import test from "node:test";
import {
  isGameplayAnswerCorrect,
  normalizeGameplayAnswer,
} from "@/features/gameplay/lib/answer-validator";
import {
  generateHiddenTokenIndexes,
  getSessionHiddenPercent,
} from "@/features/gameplay/lib/hidden-word-generator";
import { generateVersePhrases } from "@/features/gameplay/lib/phrase-generator";
import {
  areSwapTokensCorrect,
  generateSwapTokens,
  getIncorrectSwapPositions,
  reconstructSwapAnswer,
  swapTokenPositions,
} from "@/features/gameplay/lib/swap-generator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";

test("normalizes case, punctuation, Unicode width, and repeated whitespace", () => {
  assert.equal(normalizeGameplayAnswer("  LORD,   you’re good! "), "lord youre good");
  assert.equal(isGameplayAnswerCorrect("In the BEGINNING", "In the beginning."), true);
});

test("em dashes separate words during tokenization and answer comparison", () => {
  const tokens = tokenizeVerse(
    [
      "The LORD is my light and my salvation—whom shall I fear?",
      "The LORD is the stronghold of my life—whom shall I dread?",
    ].join(" "),
  );
  const salvationToken = tokens.find(({ wordText }) => wordText === "salvation");
  const whomToken = tokens.find(({ wordText }) => wordText === "whom");
  const lifeToken = tokens.find(({ wordText }) => wordText === "life");

  assert.equal(tokens.length, 24);
  assert.equal(salvationToken?.text, "salvation—");
  assert.equal(salvationToken?.trailingPunctuation, "—");
  assert.equal(salvationToken?.normalizedText, "salvation");
  assert.equal(whomToken?.text, "whom");
  assert.equal(whomToken?.normalizedText, "whom");
  assert.equal(tokens.filter(({ wordText }) => wordText === "whom").length, 2);
  assert.equal(lifeToken?.text, "life—");
  assert.equal(normalizeGameplayAnswer("salvation—whom"), "salvation whom");
  assert.deepEqual(
    tokenizeVerse("well-being").map(({ wordText }) => wordText),
    ["well-being"],
    "An ordinary hyphen inside a compound word remains part of that token.",
  );
  assert.equal(normalizeGameplayAnswer("well-being"), "wellbeing");
  assert.equal(
    isGameplayAnswerCorrect(
      [
        "The LORD is my light and my salvation whom shall I fear?",
        "The LORD is the stronghold of my life whom shall I dread?",
      ].join(" "),
      [
        "The LORD is my light and my salvation—whom shall I fear?",
        "The LORD is the stronghold of my life—whom shall I dread?",
      ].join(" "),
    ),
    true,
  );
});

test("tokenizer preserves duplicate occurrence positions", () => {
  const tokens = tokenizeVerse("the Lord is my Lord");
  assert.deepEqual(tokens.map(({ index, normalizedText }) => [index, normalizedText]), [
    [0, "the"],
    [1, "lord"],
    [2, "is"],
    [3, "my"],
    [4, "lord"],
  ]);
});

test("hidden positions are deterministic and respect the requested count", () => {
  const tokens = tokenizeVerse("one two three four five six seven eight nine ten");
  const first = generateHiddenTokenIndexes(tokens, 35, "verse:waypoint:glimmer");
  const retry = generateHiddenTokenIndexes(tokens, 35, "verse:waypoint:glimmer");

  assert.deepEqual(first, retry);
  assert.equal(first.length, 4);
});

test("tokenizer keeps surrounding punctuation out of gameplay word tiles", () => {
  const tokens = tokenizeVerse("“Love,” is kind...");
  assert.deepEqual(
    tokens.map(({ wordText, leadingPunctuation, trailingPunctuation }) => ({
      wordText,
      leadingPunctuation,
      trailingPunctuation,
    })),
    [
      { wordText: "Love", leadingPunctuation: "“", trailingPunctuation: ",”" },
      { wordText: "is", leadingPunctuation: "", trailingPunctuation: "" },
      { wordText: "kind", leadingPunctuation: "", trailingPunctuation: "..." },
    ],
  );
});

test("day difficulty percentage is stable and remains within its product range", () => {
  const first = getSessionHiddenPercent("GLIMMER", "session-1");
  const retry = getSessionHiddenPercent("GLIMMER", "session-1");
  assert.equal(first, retry);
  assert.equal(first >= 20 && first <= 35, true);
});

test("phrase boundaries remain deterministic and balanced without trailing orphans", () => {
  const tokens = tokenizeVerse(
    "one two three four five six seven eight nine ten eleven twelve thirteen fourteen",
  );
  const first = generateVersePhrases(tokens, "stable-session-seed", "GLOW");
  const retry = generateVersePhrases(tokens, "stable-session-seed", "GLOW");

  assert.deepEqual(first, retry);
  assert.equal(first.every((phrase) => {
    const size = phrase.endTokenIndex - phrase.startTokenIndex + 1;
    return size >= 2 && size <= 4;
  }), true);
  assert.equal(first.length, 5);
});

test("short Puzzle verses use the most useful balanced count their length permits", () => {
  const tokens = tokenizeVerse("Love is patient and kind");
  const glimmer = generateVersePhrases(tokens, "short-verse", "GLIMMER");
  const glow = generateVersePhrases(tokens, "short-verse", "GLOW");
  const radiance = generateVersePhrases(tokens, "short-verse", "RADIANCE");

  assert.equal(glimmer.length, 2);
  assert.equal(glow.length, 2);
  assert.equal(radiance.length, 2);
  for (const phrases of [glimmer, glow, radiance]) {
    assert.deepEqual(
      phrases.flatMap(({ text }) => text.split(" ")),
      ["Love", "is", "patient", "and", "kind"],
    );
    assert.equal(
      phrases.every((phrase) => {
        const size = phrase.endTokenIndex - phrase.startTokenIndex + 1;
        return size >= 2 && size <= 3;
      }),
      true,
    );
  }
});

test("medium Puzzle verses produce at least three readable pieces", () => {
  const nineWords = generateVersePhrases(
    tokenizeVerse("one two three four five six seven eight nine"),
    "nine-word-verse",
    "GLIMMER",
  );
  const tenWords = generateVersePhrases(
    tokenizeVerse("one two three four five six seven eight nine ten"),
    "ten-word-verse",
    "GLOW",
  );

  assert.equal(nineWords.length, 3);
  assert.equal(tenWords.length, 3);
  assert.equal(
    [...nineWords, ...tenWords].every((phrase) => {
      const size = phrase.endTokenIndex - phrase.startTokenIndex + 1;
      return size >= 2 && size <= 4;
    }),
    true,
  );
});

test("swap generation tracks duplicate words by position and can be restored", () => {
  const tokens = tokenizeVerse("the Lord is my Lord");
  const swapped = generateSwapTokens(tokens, 100, "duplicate-safe-seed");

  assert.equal(areSwapTokensCorrect(swapped), false);
  assert.deepEqual(
    swapped.map(({ originalIndex }) => originalIndex).sort((left, right) => left - right),
    [0, 1, 2, 3, 4],
  );
  assert.equal(
    areSwapTokensCorrect(tokens.map(({ index, text }) => ({
      position: index,
      originalIndex: index,
      text,
      isSwappable: true,
    }))),
    true,
  );
});

test("swap interaction exchanges identities while positions remain stable", () => {
  const tokens = tokenizeVerse("one two three four");
  const initial = generateSwapTokens(tokens, 100, "interactive-swap");
  const firstPosition = initial[0]?.position;
  const matchingPosition = initial.find(
    ({ originalIndex }) => originalIndex === firstPosition,
  )?.position;

  assert.equal(typeof firstPosition, "number");
  assert.equal(typeof matchingPosition, "number");
  if (firstPosition === undefined || matchingPosition === undefined) return;

  const moved = swapTokenPositions(initial, firstPosition, matchingPosition);
  assert.deepEqual(
    moved.map(({ position }) => position),
    initial.map(({ position }) => position),
  );
  assert.equal(
    getIncorrectSwapPositions(moved).length <
      getIncorrectSwapPositions(initial).length,
    true,
  );
});

test("swap reconstruction keeps punctuation anchored to canonical slots", () => {
  const verseTokens = tokenizeVerse("“Love,” is kind...");
  const swapped = generateSwapTokens(verseTokens, 100, "punctuation-swap");
  const restored = swapped.map((token) => ({
    ...token,
    originalIndex: token.position,
    text: verseTokens[token.position]?.wordText ?? "",
  }));

  assert.equal(reconstructSwapAnswer(restored, verseTokens), "“Love,” is kind...");
  assert.equal(areSwapTokensCorrect(restored), true);
});
