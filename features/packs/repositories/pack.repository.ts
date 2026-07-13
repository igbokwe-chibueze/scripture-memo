import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PACK_AUDIT_ACTIONS } from "@/features/packs/constants/pack-audit-actions";
import type {
  AddVerseToPackResult,
  PackWriteData,
  RemoveVerseFromPackResult,
} from "@/features/packs/types/pack.types";

const packVerseInclude = {
  verses: {
    orderBy: { position: "asc" as const },
    include: {
      verse: {
        select: {
          id: true,
          reference: true,
          book: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.PackInclude;

const auditTransactionOptions = { maxWait: 10_000, timeout: 10_000 } as const;

/** All database operations owned by admin pack management. */
export const packRepository = {
  async findMany() {
    return prisma.pack.findMany({
      include: {
        _count: { select: { verses: true } },
        verses: { select: { verse: { select: { isActive: true } } } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  },

  async findById(id: string) {
    return prisma.pack.findUnique({ where: { id }, include: packVerseInclude });
  },

  async findAvailableVerses(packId: string) {
    return prisma.verse.findMany({
      where: {
        isActive: true,
        packs: { none: { packId } },
      },
      select: { id: true, reference: true, book: true },
      orderBy: [{ book: "asc" }, { chapter: "asc" }, { verseStart: "asc" }],
    });
  },

  async create(data: PackWriteData, actorId: string, ipAddress: string | null) {
    return prisma.$transaction(async (transaction) => {
      const pack = await transaction.pack.create({
        data: { ...data, isActive: false },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.create,
          entityType: "Pack",
          entityId: pack.id,
          ipAddress,
          metadata: { name: pack.name, slug: pack.slug, isActive: false },
        },
      });
      return pack;
    }, auditTransactionOptions);
  },

  async update(
    id: string,
    data: PackWriteData,
    actorId: string,
    ipAddress: string | null,
  ) {
    return prisma.$transaction(async (transaction) => {
      const previous = await transaction.pack.findUniqueOrThrow({ where: { id } });
      const changedFields = [
        ...(previous.name !== data.name ? ["name"] : []),
        ...(previous.slug !== data.slug ? ["slug"] : []),
        ...(previous.description !== data.description ? ["description"] : []),
      ];
      const pack = await transaction.pack.update({ where: { id }, data });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.update,
          entityType: "Pack",
          entityId: pack.id,
          ipAddress,
          metadata: { name: pack.name, changedFields },
        },
      });
      return pack;
    }, auditTransactionOptions);
  },

  async addVerse(
    packId: string,
    verseId: string,
    actorId: string,
    ipAddress: string | null,
  ): Promise<AddVerseToPackResult> {
    return prisma.$transaction(async (transaction) => {
      const verse = await transaction.verse.findFirst({
        where: { id: verseId, isActive: true },
        select: { id: true, reference: true },
      });
      if (!verse) return "unavailable";

      const existing = await transaction.packVerse.findUnique({
        where: { packId_verseId: { packId, verseId } },
      });
      if (existing) return "duplicate";

      const last = await transaction.packVerse.findFirst({
        where: { packId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await transaction.packVerse.create({
        data: { packId, verseId, position: (last?.position ?? 0) + 1 },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.addVerse,
          entityType: "Pack",
          entityId: packId,
          ipAddress,
          metadata: { verseId, reference: verse.reference },
        },
      });
      return "added";
    }, auditTransactionOptions);
  },

  async removeVerse(
    packId: string,
    verseId: string,
    actorId: string,
    ipAddress: string | null,
  ): Promise<RemoveVerseFromPackResult> {
    return prisma.$transaction(async (transaction) => {
      const membership = await transaction.packVerse.findUnique({
        where: { packId_verseId: { packId, verseId } },
        include: { verse: { select: { reference: true } } },
      });
      if (!membership) return { removed: false, autoHidden: false };

      await transaction.packVerse.delete({
        where: { packId_verseId: { packId, verseId } },
      });
      const remainingCount = await transaction.packVerse.count({ where: { packId } });
      const autoHidden = remainingCount === 0;
      if (autoHidden) {
        await transaction.pack.update({ where: { id: packId }, data: { isActive: false } });
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.removeVerse,
          entityType: "Pack",
          entityId: packId,
          ipAddress,
          metadata: {
            verseId,
            reference: membership.verse.reference,
            remainingCount,
            autoHidden,
          },
        },
      });
      return { removed: true, autoHidden };
    }, auditTransactionOptions);
  },

  async reorderVerses(
    packId: string,
    orderedVerseIds: string[],
    actorId: string,
    ipAddress: string | null,
  ): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.packVerse.findMany({
        where: { packId },
        select: { verseId: true },
      });
      const currentIds = new Set(current.map((entry) => entry.verseId));
      if (
        currentIds.size !== orderedVerseIds.length ||
        orderedVerseIds.some((verseId) => !currentIds.has(verseId))
      ) {
        return false;
      }

      // WHY: Temporary negative positions avoid the unique (packId, position)
      // constraint colliding while two verses exchange positive positions.
      for (const [index, verseId] of orderedVerseIds.entries()) {
        await transaction.packVerse.update({
          where: { packId_verseId: { packId, verseId } },
          data: { position: -(index + 1) },
        });
      }
      for (const [index, verseId] of orderedVerseIds.entries()) {
        await transaction.packVerse.update({
          where: { packId_verseId: { packId, verseId } },
          data: { position: index + 1 },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.reorderVerses,
          entityType: "Pack",
          entityId: packId,
          ipAddress,
          metadata: { orderedVerseIds },
        },
      });
      return true;
    }, auditTransactionOptions);
  },

  async publish(id: string, actorId: string, ipAddress: string | null): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const publishedVerseCount = await transaction.packVerse.count({
        where: { packId: id, verse: { isActive: true } },
      });
      if (publishedVerseCount === 0) return false;

      const pack = await transaction.pack.update({
        where: { id },
        data: { isActive: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.publish,
          entityType: "Pack",
          entityId: pack.id,
          ipAddress,
          metadata: { name: pack.name, publishedVerseCount },
        },
      });
      return true;
    }, auditTransactionOptions);
  },

  async hide(id: string, actorId: string, ipAddress: string | null): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const pack = await transaction.pack.update({
        where: { id },
        data: { isActive: false },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: PACK_AUDIT_ACTIONS.hide,
          entityType: "Pack",
          entityId: pack.id,
          ipAddress,
          metadata: { name: pack.name },
        },
      });
    }, auditTransactionOptions);
  },
} as const;
