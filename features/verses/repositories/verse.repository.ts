import type { Prisma } from "@/lib/generated/prisma/client";
import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { normalizeVerseText } from "@/features/verses/lib/normalize-verse-text";
import { slugifyTag } from "@/features/verses/lib/normalize-tags";
import type {
  ParsedVerseImportRow,
  VerseListFilters,
  VerseWriteData,
} from "@/features/verses/types/verse.types";

const verseInclude = {
  translations: { orderBy: { translation: "asc" as const } },
  tags: { include: { tag: true } },
} satisfies Prisma.VerseInclude;

function tagCreates(tags: string[]): Prisma.VerseTagCreateWithoutVerseInput[] {
  return tags.map((name) => ({
    tag: {
      connectOrCreate: {
        where: { slug: slugifyTag(name) },
        create: { name, slug: slugifyTag(name) },
      },
    },
  }));
}

/** All database operations owned by admin verse management. */
export const verseRepository = {
  async findMany(filters: VerseListFilters) {
    const where: Prisma.VerseWhereInput = {
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: "insensitive" } },
              { book: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.book ? { book: filters.book } : {}),
      ...(filters.active === undefined ? {} : { isActive: filters.active }),
      ...(filters.tag ? { tags: { some: { tag: { slug: filters.tag } } } } : {}),
    };

    // WHY: These independent reads do not require an atomic snapshot. Keeping
    // them outside a database transaction avoids the transaction-acquisition
    // timeout that can occur when the list is loaded immediately after a write.
    // Promise.all retains parallel list performance while each query uses the
    // normal driver-pool queue rather than reserving a transaction connection.
    const [items, total, books, tags] = await Promise.all([
      prisma.verse.findMany({
        where,
        include: verseInclude,
        orderBy:
          filters.sort === "book-desc"
            ? [{ book: "desc" }, { chapter: "desc" }, { verseStart: "desc" }]
            : [{ book: "asc" }, { chapter: "asc" }, { verseStart: "asc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.verse.count({ where }),
      prisma.verse.findMany({ distinct: ["book"], select: { book: true }, orderBy: { book: "asc" } }),
      prisma.tag.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    ]);

    return { items, total, books: books.map((entry) => entry.book), tags };
  },

  async findById(id: string) {
    return prisma.verse.findUnique({ where: { id }, include: verseInclude });
  },

  async findAllReferences(): Promise<string[]> {
    const verses = await prisma.verse.findMany({ select: { reference: true } });
    return verses.map((verse) => verse.reference);
  },

  async create(data: VerseWriteData, createdById: string) {
    return prisma.verse.create({
      data: {
        reference: data.reference,
        book: data.book,
        chapter: data.chapter,
        verseStart: data.verseStart,
        verseEnd: data.verseEnd,
        reflection: data.reflection,
        studyNote: data.studyNote,
        isActive: data.isActive,
        createdById,
        tags: { create: tagCreates(data.tags) },
        translations: {
          create: Object.entries(data.translations).map(([translation, text]) => ({
            translation: translation as TranslationCode,
            text,
            normalizedText: normalizeVerseText(text),
          })),
        },
      },
      include: verseInclude,
    });
  },

  async importMany(
    rows: ParsedVerseImportRow[],
    actorId: string,
    ipAddress: string | null,
    skippedDuplicateCount: number,
    skippedInvalidCount: number,
  ): Promise<number> {
    if (rows.length === 0) return 0;

    // WHY: Verse creation and its audit record must succeed or fail together.
    // Each nested create also persists translations, normalized text, and tags,
    // so a partial curriculum import can never be presented as successful.
    return prisma.$transaction(
      async (transaction) => {
        for (const row of rows) {
          await transaction.verse.create({
            data: {
              reference: row.data.reference,
              book: row.data.book,
              chapter: row.data.chapter,
              verseStart: row.data.verseStart,
              verseEnd: row.data.verseEnd,
              reflection: row.data.reflection,
              studyNote: row.data.studyNote,
              isActive: row.data.isActive,
              createdById: actorId,
              tags: { create: tagCreates(row.data.tags) },
              translations: {
                create: Object.entries(row.data.translations).map(([translation, text]) => ({
                  translation: translation as TranslationCode,
                  text,
                  normalizedText: normalizeVerseText(text),
                })),
              },
            },
          });
        }

        await transaction.auditLog.create({
          data: {
            actorId,
            action: "BULK_IMPORT_VERSES",
            entityType: "Verse",
            ipAddress,
            metadata: {
              importedCount: rows.length,
              skippedDuplicateCount,
              skippedInvalidCount,
            },
          },
        });

        return rows.length;
      },
      {
        maxWait: 10_000,
        timeout: 60_000,
      },
    );
  },

  async update(id: string, data: VerseWriteData) {
    return prisma.verse.update({
      where: { id },
      data: {
        reference: data.reference,
        book: data.book,
        chapter: data.chapter,
        verseStart: data.verseStart,
        verseEnd: data.verseEnd,
        reflection: data.reflection,
        studyNote: data.studyNote,
        isActive: data.isActive,
        tags: { deleteMany: {}, create: tagCreates(data.tags) },
        translations: {
          upsert: Object.entries(data.translations).map(([translation, text]) => ({
            where: { verseId_translation: { verseId: id, translation: translation as TranslationCode } },
            update: { text, normalizedText: normalizeVerseText(text) },
            create: { translation: translation as TranslationCode, text, normalizedText: normalizeVerseText(text) },
          })),
        },
      },
      include: verseInclude,
    });
  },

  async archive(id: string): Promise<void> {
    await prisma.verse.update({ where: { id }, data: { isActive: false } });
  },

  async publish(id: string): Promise<void> {
    await prisma.verse.update({ where: { id }, data: { isActive: true } });
  },

  async upsertTranslation(verseId: string, translation: TranslationCode, text: string): Promise<void> {
    await prisma.verseTranslation.upsert({
      where: { verseId_translation: { verseId, translation } },
      update: { text, normalizedText: normalizeVerseText(text) },
      create: { verseId, translation, text, normalizedText: normalizeVerseText(text) },
    });
  },
} as const;
