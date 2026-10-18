/** Owner-supplied fixed scripture excerpts; never use a learner's translation setting. */
export const LOADING_VERSES = [
  {
    reference: "Psalm 119:11",
    text: "Thy word have I hid in mine heart, that I might not sin against thee.",
    weight: 2,
  },
  {
    reference: "Psalm 119:105",
    text: "Thy word is a lamp unto my feet, and a light unto my path.",
    weight: 2,
  },
  {
    reference: "Psalm 119:130",
    text: "The entrance of thy words giveth light; it giveth understanding unto the simple.",
    weight: 2,
  },
  {
    reference: "Psalm 119:97",
    text: "O how love I thy law! it is my meditation all the day.",
    weight: 2,
  },
  {
    reference: "Psalm 119:9",
    text: "Wherewithal shall a young man cleanse his way? by taking heed thereto according to thy word.",
    weight: 1,
  },
  {
    reference: "Psalm 1:2",
    text: "But his delight is in the law of the LORD; and in his law doth he meditate day and night.",
    weight: 2,
  },
  {
    reference: "Psalm 119:15",
    text: "I will meditate in thy precepts, and have respect unto thy ways.",
    weight: 2,
  },
  {
    reference: "Psalm 119:16",
    text: "I will delight myself in thy statutes: I will not forget thy word.",
    weight: 2,
  },
  {
    reference: "2 Timothy 2:15",
    text: "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.",
    weight: 2,
  },
  {
    reference: "1 Peter 2:2",
    text: "As newborn babes, desire the sincere milk of the word, that ye may grow thereby:",
    weight: 1,
  },
  {
    reference: "James 1:22",
    text: "But be ye doers of the word, and not hearers only, deceiving your own selves.",
    weight: 1,
  },
  {
    reference: "Colossians 3:16",
    text: "Let the word of Christ dwell in you richly in all wisdom.",
    weight: 1,
  },
] as const;

/** Weighted sampling without an immediate repeat; injectable randomness makes boundaries testable. */
export function chooseLoadingVerse(previous: number | null, random: number = Math.random()): number {
  const candidates = LOADING_VERSES.map((verse, index) => ({ ...verse, index }))
    .filter((verse) => verse.index !== previous);
  const total = candidates.reduce((sum, verse) => sum + verse.weight, 0);
  let target = Math.max(0, Math.min(random, 1)) * total;
  for (const verse of candidates) {
    target -= verse.weight;
    if (target < 0) return verse.index;
  }
  return candidates[candidates.length - 1].index;
}

/** Give every passage at least eight seconds, extending for longer excerpts. */
export function loadingVerseDuration(text: string): number {
  return Math.max(8000, text.trim().split(/\s+/u).length * 300);
}
