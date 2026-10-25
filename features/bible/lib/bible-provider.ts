import "server-only";

/** Public Scripture is cached independently of private learner marks; no API key is required. */
import { z } from "zod";
import { BIBLE_TRANSLATIONS } from "../data/bible-catalog";
import { BIBLE_AUDIO_ORIGINS } from "../constants/bible-audio-origins";
import type { BibleReference } from "../schemas/bible.schema";
import type {
  BibleChapter,
  BibleLexicon,
  BibleSearchHit,
  BibleStudy,
} from "../types/bible.types";

const sourceSchema = z.object({
  name: z.string(),
  website: z.url().refine((url) => url.startsWith("https://")),
  licenseUrl: z.url().refine((url) => url.startsWith("https://")),
  licenseNotes: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
});
const pieceSchema = z.union([
  z.string(),
  z.object({ text: z.string().optional(), lineBreak: z.boolean().optional() }),
]);
const contentSchema = z.object({
  type: z.string(),
  number: z.number().optional(),
  text: z.string().optional(),
  content: z.array(pieceSchema).optional(),
  footnotes: z.array(z.object({ text: z.string() })).optional(),
});
const chapterSchema = z.object({
  translation: sourceSchema,
  chapter: z.object({ content: z.array(contentSchema) }),
  thisChapterAudioLinks: z.record(z.string(), z.string()).optional(),
});

/** Fixed-origin fetch with a deadline; 404 means unavailable, never fabricated replacement content. */
async function readProvider(path: string, complete = false): Promise<unknown> {
  const response = await fetch(`https://bible.helloao.org/api/${path}`, {
    ...(complete
      ? { cache: "no-store" as const }
      : { next: { revalidate: 86400 } }),
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Bible provider unavailable.");
  const text = await response.text();
  if (text.length > (complete ? 25000000 : 2000000))
    throw new Error("Bible response too large.");
  return JSON.parse(text) as unknown;
}

/** Structured provider text is rendered as React text, never trusted HTML. */
function plainText(item: z.infer<typeof contentSchema>): string {
  return (
    item.text ??
    (item.content ?? [])
      .map((piece) =>
        typeof piece === "string"
          ? piece
          : (piece.text ?? (piece.lineBreak ? "\n" : "")),
      )
      .join(" ")
  );
}

/** Loads one complete chapter, retaining section headings and footnotes when supplied. */
export async function loadBibleChapter(
  reference: BibleReference,
): Promise<BibleChapter> {
  const data = chapterSchema.parse(
    await readProvider(
      `${BIBLE_TRANSLATIONS[reference.translation]}/${reference.book}/${reference.chapter}.simple.json`,
    ),
  );
  let heading: string | undefined;
  const verses: BibleChapter["verses"] = [];
  for (const item of data.chapter.content) {
    if (item.type === "heading") heading = plainText(item);
    if (item.type === "verse" && item.number) {
      verses.push({
        number: item.number,
        text: plainText(item),
        heading,
        footnotes: item.footnotes?.map((note) => note.text) ?? [],
      });
      heading = undefined;
    }
  }
  // Audio is playable only from known HTTPS hosts; arbitrary provider URLs never execute.
  const audio = Object.fromEntries(
    Object.entries(data.thisChapterAudioLinks ?? {}).filter(([, url]) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.protocol === "https:" &&
          BIBLE_AUDIO_ORIGINS.some((origin) => origin === parsed.origin)
        );
      } catch {
        return false;
      }
    }),
  );
  return { verses, audio, source: data.translation };
}

/** The author catalogue is live so unavailable resources can be clearly identified by name. */
export async function loadBibleCommentaries(): Promise<
  { id: string; name: string }[]
> {
  return z
    .object({
      commentaries: z.array(z.object({ id: z.string(), name: z.string() })),
    })
    .parse(await readProvider("available_commentaries.json")).commentaries;
}

/** Fetches only the selected study dataset; chapter caching makes repeated verse selection inexpensive. */
export async function loadBibleStudy(
  reference: BibleReference,
  tab: "words" | "commentary" | "crossReferences",
  commentary: string,
): Promise<BibleStudy | null> {
  const prefix =
    tab === "commentary"
      ? `c/${commentary}`
      : `d/${tab === "words" ? "bsb-interlinear" : "open-cross-ref"}`;
  const raw = await readProvider(
    `${prefix}/${reference.book}/${reference.chapter}.json`,
  );
  if (!raw) return null;
  if (tab === "commentary") {
    const data = z
      .object({
        commentary: sourceSchema,
        chapter: z.object({
          introduction: z.string().nullish(),
          content: z.array(contentSchema),
        }),
      })
      .parse(raw);
    // Preserve the whole chapter and the publisher's verse anchors. Some entries
    // discuss a range; never duplicate those notes under invented verse headings.
    return {
      commentary: {
        introduction: data.chapter.introduction?.trim() || undefined,
        entries: data.chapter.content.flatMap((item) => {
          const text = plainText(item).trim();
          if (
            item.type !== "verse" ||
            typeof item.number !== "number" ||
            !Number.isInteger(item.number) ||
            item.number < 1 ||
            !text
          )
            return [];
          return [{ verse: item.number, text }];
        }),
      },
      source: data.commentary,
    };
  }
  const word = z.object({
    pos: z.number(),
    text: z.string(),
    language: z.string(),
    transliteration: z
      .string()
      .nullish()
      .transform((value) => value ?? ""),
    strongs: z
      .string()
      .nullish()
      .transform((value) => value ?? ""),
    gloss: z
      .string()
      .nullish()
      .transform((value) => value ?? ""),
    parsingFull: z
      .string()
      .nullish()
      .transform((value) => value ?? ""),
  });
  const crossReference = z.object({
    book: z.string(),
    chapter: z.number().int(),
    verse: z.number().int(),
    endVerse: z.number().optional(),
  });
  const data = z
    .object({
      dataset: sourceSchema,
      chapter: z.object({
        content: z.array(
          z.object({
            verse: z.number(),
            words: z.array(word).optional(),
            references: z.array(crossReference).optional(),
          }),
        ),
      }),
    })
    .parse(raw);
  const verse = data.chapter.content.find(
    (item) => item.verse === reference.verse,
  );
  return {
    words: verse?.words,
    references: verse?.references,
    source: data.dataset,
  };
}

/** Lexicon IDs are validated at the action boundary; entries retain all distinct lexical senses. */
export async function loadBibleLexicon(
  id: string,
): Promise<BibleLexicon | null> {
  const raw = await readProvider(`d/stepbible-lexicon/lexicon/${id}.json`);
  if (!raw) return null;
  return z
    .object({
      entry: z.object({
        senses: z.array(
          z.object({
            id: z.string(),
            language: z.string(),
            lemma: z.string(),
            transliteration: z.string(),
            gloss: z.string(),
            definition: z.string(),
            partOfSpeech: z.string(),
          }),
        ),
      }),
    })
    .parse(raw).entry;
}

// Full-text search needs a full corpus: keep at most three public indexes per worker for 24h.
// Single-flight promises deduplicate cold concurrent searches. Failed loads are removed so Retry works.
// No user data enters this cache and no recurring requests/polling/database writes are performed.
const indexes = new Map<
  string,
  { expires: number; promise: Promise<BibleSearchHit[]> }
>();
async function searchIndex(
  translation: BibleReference["translation"],
): Promise<BibleSearchHit[]> {
  const cached = indexes.get(translation);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = (async (): Promise<BibleSearchHit[]> => {
    const data = z
      .object({
        books: z.array(
          z.object({
            id: z.string(),
            chapters: z.array(
              z.object({
                chapter: z.object({
                  number: z.number(),
                  content: z.array(contentSchema),
                }),
              }),
            ),
          }),
        ),
      })
      .parse(
        await readProvider(
          `${BIBLE_TRANSLATIONS[translation]}/complete.simple.json`,
          true,
        ),
      );
    return data.books.flatMap((book) =>
      book.chapters.flatMap(({ chapter }) =>
        chapter.content
          .filter((item) => item.type === "verse" && item.number)
          .map((item) => ({
            book: book.id,
            chapter: chapter.number,
            verse: item.number!,
            translation,
            text: plainText(item),
          })),
      ),
    );
  })();
  indexes.set(translation, { expires: Date.now() + 86400000, promise });
  try {
    return await promise;
  } catch (error) {
    indexes.delete(translation);
    throw error;
  }
}

/** Case-insensitive literal phrase search, returned in canonical order with bounded pagination. */
export async function searchBibleText(
  q: string,
  translation: BibleReference["translation"],
  page: number,
): Promise<{ hits: BibleSearchHit[]; total: number }> {
  const matches = (await searchIndex(translation)).filter((verse) =>
    verse.text.toLowerCase().includes(q.toLowerCase()),
  );
  return {
    hits: matches.slice((page - 1) * 20, page * 20),
    total: matches.length,
  };
}
