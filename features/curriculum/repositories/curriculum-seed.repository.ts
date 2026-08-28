import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { normalizePostgresSslUrl } from "@/lib/database/normalize-postgres-ssl-url";
import { normalizeVerseText } from "@/features/verses/lib/normalize-verse-text";
import { slugifyTag } from "@/features/verses/lib/normalize-tags";
import type { CurriculumData } from "@/features/curriculum/types/curriculum-data.types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the curriculum.");
}

// The standalone seed owns a short-lived client and always disconnects in seed.ts.
const seedClient = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizePostgresSslUrl(connectionString),
  }),
});

export type CurriculumSeedSummary = {
  createdVerses: number;
  createdWaypoints: number;
};

/**
 * Adds missing canonical curriculum records without overwriting existing ones.
 *
 * This is deliberately idempotent. Once learner history exists, ordinary seed
 * runs must never rewrite a verse or permanent waypoint assignment. The explicit
 * local reset command is the only workflow that replaces an established catalog.
 */
export async function seedCurriculumCatalog(
  data: CurriculumData,
): Promise<CurriculumSeedSummary> {
  return seedClient.$transaction(
    async (transaction) => {
      const existingVerses = await transaction.verse.findMany({
        where: { reference: { in: data.verses.map(({ reference }) => reference) } },
        select: { id: true, reference: true },
      });
      const verseIds = new Map(
        existingVerses.map(({ id, reference }) => [reference, id]),
      );
      let createdVerses = 0;

      for (const verseData of data.verses) {
        if (verseIds.has(verseData.reference)) continue;
        const verse = await transaction.verse.create({
          data: {
            reference: verseData.reference,
            book: verseData.book,
            chapter: verseData.chapter,
            verseStart: verseData.verseStart,
            verseEnd: verseData.verseEnd,
            reflection: verseData.reflection,
            studyNote: verseData.studyNote,
            isActive: true,
            translations: {
              create: Object.entries(verseData.translations).map(
                ([translation, text]) => ({
                  translation: translation as TranslationCode,
                  text,
                  normalizedText: normalizeVerseText(text),
                }),
              ),
            },
            tags: {
              create: verseData.tags.map((name) => ({
                tag: {
                  connectOrCreate: {
                    where: { slug: slugifyTag(name) },
                    create: { name, slug: slugifyTag(name) },
                  },
                },
              })),
            },
          },
          select: { id: true },
        });
        verseIds.set(verseData.reference, verse.id);
        createdVerses += 1;
      }

      const existingWaypointNumbers = new Set(
        (
          await transaction.waypoint.findMany({
            where: { number: { in: data.waypoints.map(({ number }) => number) } },
            select: { number: true },
          })
        ).map(({ number }) => number),
      );
      const missingWaypoints = data.waypoints.filter(
        ({ number }) => !existingWaypointNumbers.has(number),
      );
      if (missingWaypoints.length > 0) {
        await transaction.waypoint.createMany({
          data: missingWaypoints.map((waypoint) => {
            const verseId = verseIds.get(waypoint.reference);
            if (!verseId) throw new Error(`Missing verse ${waypoint.reference}.`);
            return {
              number: waypoint.number,
              verseId,
              journeyStage: waypoint.journeyStage,
              isActive: true,
            };
          }),
        });
      }

      return {
        createdVerses,
        createdWaypoints: missingWaypoints.length,
      };
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}

/** Releases the seed-only connection pool after success or failure. */
export async function disconnectCurriculumSeedRepository(): Promise<void> {
  await seedClient.$disconnect();
}
