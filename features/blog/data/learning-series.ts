/**
 * Static metadata for the twelve articles explicitly approved for publication.
 * Markdown stays in this feature's data directory as reviewable editorial source;
 * after import, the CMS database remains authoritative for subsequent edits.
 */
export const LEARNING_SERIES = [
  {
    file: "recognizing-versus-recalling-scripture.md",
    slug: "recognizing-versus-recalling-scripture",
    title: "Why You Recognize a Bible Verse but Cannot Recite It",
    excerpt: "Familiarity and independent recall ask different things of you. See how Scripture Memo helps you move from recognizing a passage toward supplying its words yourself.",
  },
  {
    file: "remember-before-showing-the-answer.md",
    slug: "remember-before-showing-the-answer",
    title: "Why We Ask You to Remember Before Showing the Answer",
    excerpt: "Discover retrieval practice, why an honest recall attempt belongs alongside reading, and how to use support without losing the opportunity to remember.",
  },
  {
    file: "why-we-wait-between-challenges.md",
    slug: "why-we-wait-between-challenges",
    title: "Why Scripture Memo Makes You Wait Between Challenges",
    excerpt: "Understand spaced practice, our twelve-hour minimum between challenge stages, and why an unlock time is permission to continue rather than a deadline.",
  },
  {
    file: "why-verses-return-after-success.md",
    slug: "why-verses-return-after-success",
    title: "Getting It Right Once Is a Beginning: Why Verses Return",
    excerpt: "Learn why a familiar verse returns through Recall, Strengthen, and Master, and how later practice fits into a journey that continues beyond first success.",
  },
  {
    file: "from-game-board-to-everyday-recall.md",
    slug: "from-game-board-to-everyday-recall",
    title: "From the Game Board to Everyday Recall",
    excerpt: "A practical routine for recalling a passage without tiles, checking it accurately, and keeping context and meaning at the center of your practice.",
  },
  {
    file: "why-one-verse-has-five-modes.md",
    slug: "why-one-verse-has-five-modes",
    title: "Repetition Without Mindless Repeating: Why One Verse Has Five Game Modes",
    excerpt: "Each mode gives you a different job: place words, rebuild phrases, repair order, and supply missing wording. Discover the purpose behind repeated encounters with one verse.",
  },
  {
    file: "why-we-gradually-remove-the-words.md",
    slug: "why-we-gradually-remove-the-words",
    title: "Why We Gradually Remove the Words",
    excerpt: "See how Glimmer, Glow, and Radiance move from supported practice toward greater independence, and why less help should create a useful challenge rather than unnecessary frustration.",
  },
  {
    file: "learning-from-wrong-answers.md",
    slug: "learning-from-wrong-answers",
    title: "A Wrong Answer Can Become a Useful Learning Moment",
    excerpt: "Learn how corrective feedback can guide your next attempt, how to examine an uncertain phrase, and why a mistake is information rather than a verdict about your ability.",
  },
  {
    file: "hints-that-help-you-learn.md",
    slug: "hints-that-help-you-learn",
    title: "Hints That Help You Learn Rather Than Skip the Learning",
    excerpt: "A practical approach to assistance: make an honest recall attempt, use permitted help when needed, and let the help lead you back to the passage.",
  },
  {
    file: "rest-sleep-and-remembering-scripture.md",
    slug: "rest-sleep-and-remembering-scripture",
    title: "Your Brain Needs More Than Another Practice Session",
    excerpt: "Explore sleep's role in memory and a sustainable practice rhythm. An unlock time gives you permission to continue; it does not require sacrificing rest.",
  },
  {
    file: "what-scores-say-about-your-memory.md",
    slug: "what-scores-say-about-your-memory",
    title: "Does a Higher Score Mean a Stronger Memory?",
    excerpt: "Understand what XP, badges, streaks, and completed challenges actually record, and how to keep independent recall at the center of your progress.",
  },
  {
    file: "remember-the-words-understand-the-passage.md",
    slug: "remember-the-words-understand-the-passage",
    title: "Remember the Words, Understand the Passage",
    excerpt: "Memorization can accompany context, study, and reflection. Learn how to keep accurate wording connected to thoughtful reading beyond the game board.",
  },
] as const;
