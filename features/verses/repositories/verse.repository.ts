import type { Prisma } from "@/lib/generated/prisma/client";
import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { normalizeVerseText } from "@/features/verses/lib/normalize-verse-text";
import { slugifyTag } from "@/features/verses/lib/normalize-tags";
import { formatBibleReference } from "@/features/verses/lib/bible-reference";
import { VERSE_AUDIT_ACTIONS } from "@/features/verses/constants/verse-audit-actions";
import type {
  ParsedVerseImportRow,
  VerseListFilters,
  VerseWriteData,
} from "@/features/verses/types/verse.types";

const verseInclude = {
  translations: { orderBy: { translation: "asc" as const } },
  tags: { include: { tag: true } },
} satisfies Prisma.VerseInclude;

const verseAuditSnapshotInclude = {
  translations: { select: { translation: true, text: true } },
  tags: { include: { tag: { select: { name: true } } } },
} satisfies Prisma.VerseInclude;

type VerseAuditSnapshot = Prisma.VerseGetPayload<{
  include: typeof verseAuditSnapshotInclude;
}>;

const shortAuditTransactionOptions = {
  maxWait: 10_000,
  timeout: 10_000,
} as const;

export type VerseCurriculumConflictCode =
  | "PUBLISHED_WAYPOINT_DEPENDENCY"
  | "LEARNER_HISTORY_LOCK";

/** Carries a safe, structured curriculum conflict from the repository to an action. */
export class VerseCurriculumConflictError extends Error {
  readonly code: VerseCurriculumConflictCode;
  readonly waypointNumbers: number[];

  constructor(code: VerseCurriculumConflictCode, waypointNumbers: number[]) {
    super(code);
    this.name = "VerseCurriculumConflictError";
    this.code = code;
    this.waypointNumbers = waypointNumbers;
  }
}

/** Prevents verse assignment, archival, and content edits from validating concurrently. */
async function lockVerse(transaction: Prisma.TransactionClient, verseId: string): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-verse'), hashtext(${verseId}))`;
}

/** Finds historical waypoint references whose learner data must remain reproducible. */
async function findProgressedWaypointNumbers(
  transaction: Prisma.TransactionClient,
  verseId: string,
): Promise<number[]> {
  const waypoints = await transaction.waypoint.findMany({
    where: {
      verseId,
      OR: [
        { userProgress: { some: {} } },
        { dayProgress: { some: {} } },
        { gameSessions: { some: {} } },
      ],
    },
    select: { number: true },
    orderBy: { number: "asc" },
  });
  return waypoints.map(({ number }) => number);
}

/** Finds live curriculum entries that would be broken by archiving the verse. */
async function findPublishedWaypointNumbers(
  transaction: Prisma.TransactionClient,
  verseId: string,
): Promise<number[]> {
  const waypoints = await transaction.waypoint.findMany({
    where: { verseId, isActive: true },
    select: { number: true },
    orderBy: { number: "asc" },
  });
  return waypoints.map(({ number }) => number);
}

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

function getChangedFields(previous: VerseAuditSnapshot, next: VerseWriteData): string[] {
  const changedFields: string[] = [];
  if (previous.reference !== next.reference) changedFields.push("reference");
  if (previous.book !== next.book) changedFields.push("book");
  if (previous.chapter !== next.chapter) changedFields.push("chapter");
  if (previous.verseStart !== next.verseStart) changedFields.push("verseStart");
  if (previous.verseEnd !== next.verseEnd) changedFields.push("verseEnd");
  if (previous.reflection !== next.reflection) changedFields.push("reflection");
  if (previous.studyNote !== next.studyNote) changedFields.push("studyNote");
  if (previous.isActive !== next.isActive) changedFields.push("isActive");

  const previousTags = previous.tags.map(({ tag }) => tag.name).sort();
  const nextTags = [...next.tags].sort();
  if (previousTags.join("\u0000") !== nextTags.join("\u0000")) {
    changedFields.push("tags");
  }

  const previousTranslations = new Map(
    previous.translations.map((translation) => [translation.translation, translation.text]),
  );
  if (
    previousTranslations.size !== Object.keys(next.translations).length ||
    Object.entries(next.translations).some(
      ([translation, text]) =>
        previousTranslations.get(translation as TranslationCode) !== text,
    )
  ) {
    changedFields.push("translations");
  }

  return changedFields;
}

async function setVerseActiveStatus(
  id: string,
  isActive: boolean,
  actorId: string,
  ipAddress: string | null,
): Promise<void> {
  // WHY: Curriculum availability and its audit record are one atomic operation.
  // Reading the prior value inside the same transaction makes the audit metadata
  // accurate even when an administrator repeats an already-applied action.
  await prisma.$transaction(async (transaction) => {
    await lockVerse(transaction, id);
    if (!isActive) {
      const publishedWaypointNumbers = await findPublishedWaypointNumbers(transaction, id);
      if (publishedWaypointNumbers.length > 0) {
        throw new VerseCurriculumConflictError(
          "PUBLISHED_WAYPOINT_DEPENDENCY",
          publishedWaypointNumbers,
        );
      }
    }
    const previous = await transaction.verse.findUniqueOrThrow({
      where: { id },
      select: { id: true, reference: true, isActive: true },
    });
    const verse = await transaction.verse.update({
      where: { id },
      data: { isActive },
      select: { id: true, reference: true, isActive: true },
    });

    await transaction.auditLog.create({
      data: {
        actorId,
        action: isActive
          ? VERSE_AUDIT_ACTIONS.publish
          : VERSE_AUDIT_ACTIONS.archive,
        entityType: "Verse",
        entityId: verse.id,
        ipAddress,
        metadata: {
          reference: verse.reference,
          previousStatus: previous.isActive ? "published" : "archived",
          newStatus: verse.isActive ? "published" : "archived",
        },
      },
    });
  }, shortAuditTransactionOptions);
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
    const verses = await prisma.verse.findMany({
      select: { book: true, chapter: true, verseStart: true, verseEnd: true },
    });
    return verses.map((verse) => formatBibleReference(
      verse.book,
      verse.chapter,
      verse.verseStart,
      verse.verseEnd,
    ));
  },

  async create(data: VerseWriteData, actorId: string, ipAddress: string | null) {
    // WHY: The content write and its audit evidence form one administrative
    // operation. A transaction prevents curriculum content from being created
    // without a matching accountability record, or vice versa.
    return prisma.$transaction(async (transaction) => {
      const verse = await transaction.verse.create({
        data: {
          reference: data.reference,
          book: data.book,
          chapter: data.chapter,
          verseStart: data.verseStart,
          verseEnd: data.verseEnd,
          reflection: data.reflection,
          studyNote: data.studyNote,
          isActive: data.isActive,
          createdById: actorId,
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

      await transaction.auditLog.create({
        data: {
          actorId,
          action: VERSE_AUDIT_ACTIONS.create,
          entityType: "Verse",
          entityId: verse.id,
          ipAddress,
          metadata: {
            reference: verse.reference,
            isActive: verse.isActive,
            translationCount: verse.translations.length,
            tagCount: verse.tags.length,
          },
        },
      });

      return verse;
    }, shortAuditTransactionOptions);
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
            action: VERSE_AUDIT_ACTIONS.bulkImport,
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

  async update(
    id: string,
    data: VerseWriteData,
    actorId: string,
    ipAddress: string | null,
  ) {
    return prisma.$transaction(async (transaction) => {
      await lockVerse(transaction, id);
      const previous = await transaction.verse.findUniqueOrThrow({
        where: { id },
        include: verseAuditSnapshotInclude,
      });
      const changedFields = getChangedFields(previous, data);
      if (changedFields.length > 0) {
        const progressedWaypointNumbers = await findProgressedWaypointNumbers(transaction, id);
        if (progressedWaypointNumbers.length > 0) {
          throw new VerseCurriculumConflictError(
            "LEARNER_HISTORY_LOCK",
            progressedWaypointNumbers,
          );
        }
      }
      if (!data.isActive) {
        const publishedWaypointNumbers = await findPublishedWaypointNumbers(transaction, id);
        if (publishedWaypointNumbers.length > 0) {
          throw new VerseCurriculumConflictError(
            "PUBLISHED_WAYPOINT_DEPENDENCY",
            publishedWaypointNumbers,
          );
        }
      }
      const verse = await transaction.verse.update({
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

      // WHY: Only field names enter metadata. Translation text, reflections,
      // and study notes stay in their owning records instead of being duplicated
      // into a long-lived security audit trail.
      await transaction.auditLog.create({
        data: {
          actorId,
          action: VERSE_AUDIT_ACTIONS.update,
          entityType: "Verse",
          entityId: verse.id,
          ipAddress,
          metadata: { reference: verse.reference, changedFields },
        },
      });

      return verse;
    }, shortAuditTransactionOptions);
  },

  async archive(id: string, actorId: string, ipAddress: string | null): Promise<void> {
    await setVerseActiveStatus(id, false, actorId, ipAddress);
  },

  async publish(id: string, actorId: string, ipAddress: string | null): Promise<void> {
    await setVerseActiveStatus(id, true, actorId, ipAddress);
  },

  async upsertTranslation(verseId: string, translation: TranslationCode, text: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      await lockVerse(transaction, verseId);
      const progressedWaypointNumbers = await findProgressedWaypointNumbers(transaction, verseId);
      if (progressedWaypointNumbers.length > 0) {
        throw new VerseCurriculumConflictError(
          "LEARNER_HISTORY_LOCK",
          progressedWaypointNumbers,
        );
      }
      await transaction.verseTranslation.upsert({
        where: { verseId_translation: { verseId, translation } },
        update: { text, normalizedText: normalizeVerseText(text) },
        create: { verseId, translation, text, normalizedText: normalizeVerseText(text) },
      });
    }, shortAuditTransactionOptions);
  },
} as const;
