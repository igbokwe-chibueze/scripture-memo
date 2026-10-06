import type { Prisma } from "@/lib/generated/prisma/client";
import { UserNotificationType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  FellowshipConflictCode,
  FellowshipModerationItem,
} from "@/features/fellowships/types/fellowship.types";

const transactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;
const DISSOLUTION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/** Carries safe, stable Fellowship conditions back to the Server Action layer. */
export class FellowshipGovernanceError extends Error {
  constructor(readonly code: FellowshipConflictCode) {
    super(code);
    this.name = "FellowshipGovernanceError";
  }
}

/**
 * Serializes mutations that depend on a Fellowship's current leader or status.
 * Membership and governance operations share this lock so a join cannot race
 * a closure and a transfer cannot race another leader-only action.
 */
async function lockFellowship(
  transaction: Prisma.TransactionClient,
  fellowshipId: string,
): Promise<void> {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext('scripture-memo-fellowship-governance'),
      hashtext(${fellowshipId})
    )
  `;
}

/**
 * Adds an in-app notice as part of the owning governance transaction.
 * The dedupe key is stable for each event and recipient; raw user IDs stay in
 * server-side database rows and are never sent as notification copy.
 */
async function createNotice(
  transaction: Prisma.TransactionClient,
  input: {
    userId: string;
    type: UserNotificationType;
    dedupeKey: string;
    payload: Prisma.InputJsonValue;
  },
): Promise<void> {
  await transaction.userNotification.create({
    data: input,
  });
}

/**
 * Owns leadership handoffs, recoverable closure, and audited Super Admin
 * recovery. All state changes are transactional and retain Fellowship history.
 */
export const fellowshipGovernanceRepository = {
  /** Creates a leader-initiated offer to an existing member. */
  async requestLeadershipTransfer(
    leaderId: string,
    fellowshipId: string,
    targetMembershipId: string,
  ): Promise<{ transferId: string; slug: string; name: string }> {
    return prisma.$transaction(async (transaction) => {
      await lockFellowship(transaction, fellowshipId);

      const fellowship = await transaction.fellowship.findFirst({
        where: {
          id: fellowshipId,
          createdById: leaderId,
          dissolutions: {
            none: { status: { in: ["SCHEDULED", "FORCED"] } },
          },
        },
        select: { slug: true, name: true },
      });
      if (!fellowship) throw new FellowshipGovernanceError("NOT_LEADER");

      const existingTransfer =
        await transaction.fellowshipLeadershipTransfer.findFirst({
          where: { fellowshipId, status: "PENDING" },
          select: { id: true },
        });
      if (existingTransfer) {
        throw new FellowshipGovernanceError("TRANSFER_PENDING");
      }

      const target = await transaction.fellowshipMember.findFirst({
        where: {
          id: targetMembershipId,
          fellowshipId,
          userId: { not: leaderId },
        },
        select: {
          userId: true,
          user: { select: { profile: { select: { displayName: true } } } },
        },
      });
      if (!target) throw new FellowshipGovernanceError("MEMBER_NOT_FOUND");

      const transfer = await transaction.fellowshipLeadershipTransfer.create({
        data: {
          fellowshipId,
          fromLeaderId: leaderId,
          targetUserId: target.userId,
        },
        select: { id: true },
      });

      await createNotice(transaction, {
        userId: target.userId,
        type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
        dedupeKey: `fellowship-transfer-offer:${transfer.id}:${target.userId}`,
        payload: {
          event: "OFFER",
          fellowshipSlug: fellowship.slug,
          fellowshipName: fellowship.name,
          transferId: transfer.id,
          displayName: target.user.profile?.displayName ?? "Player",
        },
      });

      return { transferId: transfer.id, ...fellowship };
    }, transactionOptions);
  },

  /** Accepts or declines an offer only when called by its intended recipient. */
  async respondLeadershipTransfer(
    recipientId: string,
    transferId: string,
    response: "ACCEPT" | "DECLINE",
  ): Promise<{ slug: string; accepted: boolean }> {
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.fellowshipLeadershipTransfer.findFirst({
        where: { id: transferId, status: "PENDING", targetUserId: recipientId },
        select: { fellowshipId: true },
      });
      if (!initial) {
        throw new FellowshipGovernanceError("TRANSFER_NOT_RECIPIENT");
      }

      await lockFellowship(transaction, initial.fellowshipId);

      const transfer = await transaction.fellowshipLeadershipTransfer.findFirst({
        where: {
          id: transferId,
          status: "PENDING",
          targetUserId: recipientId,
          fellowship: {
            dissolutions: {
              none: { status: { in: ["SCHEDULED", "FORCED"] } },
            },
          },
        },
        select: {
          id: true,
          fellowshipId: true,
          fromLeaderId: true,
          targetUserId: true,
          fellowship: {
            select: {
              slug: true,
              name: true,
              createdById: true,
              members: {
                where: { userId: recipientId },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      });
      if (!transfer || transfer.fellowship.createdById !== transfer.fromLeaderId) {
        throw new FellowshipGovernanceError("TRANSFER_NOT_FOUND");
      }
      if (transfer.fellowship.members.length !== 1) {
        throw new FellowshipGovernanceError("MEMBER_NOT_FOUND");
      }

      const accepted = response === "ACCEPT";
      const resolvedAt = new Date();
      await transaction.fellowshipLeadershipTransfer.update({
        where: { id: transfer.id },
        data: {
          status: accepted ? "ACCEPTED" : "DECLINED",
          resolvedAt,
        },
      });

      if (accepted) {
        await transaction.fellowship.update({
          where: { id: transfer.fellowshipId },
          data: { createdById: recipientId },
        });
        await transaction.auditLog.create({
          data: {
            actorId: recipientId,
            action: "FELLOWSHIP_LEADERSHIP_TRANSFER_ACCEPTED",
            entityType: "Fellowship",
            entityId: transfer.fellowshipId,
            metadata: {
              previousLeaderId: transfer.fromLeaderId,
              newLeaderId: recipientId,
              transferId: transfer.id,
            },
          },
        });
      }

      await createNotice(transaction, {
        userId: transfer.fromLeaderId,
        type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
        dedupeKey: `fellowship-transfer-response:${transfer.id}:${transfer.fromLeaderId}`,
        payload: {
          event: accepted ? "ACCEPTED" : "DECLINED",
          fellowshipSlug: transfer.fellowship.slug,
          fellowshipName: transfer.fellowship.name,
        },
      });

      if (accepted) {
        await createNotice(transaction, {
          userId: recipientId,
          type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
          dedupeKey: `fellowship-transfer-complete:${transfer.id}:${recipientId}`,
          payload: {
            event: "BECAME_LEADER",
            fellowshipSlug: transfer.fellowship.slug,
            fellowshipName: transfer.fellowship.name,
          },
        });
      }

      return { slug: transfer.fellowship.slug, accepted };
    }, transactionOptions);
  },

  /** Lets the current leader cancel an unanswered transfer offer. */
  async cancelLeadershipTransfer(
    leaderId: string,
    transferId: string,
  ): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.fellowshipLeadershipTransfer.findFirst({
        where: { id: transferId, status: "PENDING" },
        select: { fellowshipId: true },
      });
      if (!initial) throw new FellowshipGovernanceError("TRANSFER_NOT_FOUND");

      await lockFellowship(transaction, initial.fellowshipId);
      const transfer = await transaction.fellowshipLeadershipTransfer.findFirst({
        where: {
          id: transferId,
          status: "PENDING",
          fromLeaderId: leaderId,
          fellowship: { createdById: leaderId },
        },
        select: {
          id: true,
          targetUserId: true,
          fellowship: { select: { slug: true, name: true } },
        },
      });
      if (!transfer) throw new FellowshipGovernanceError("TRANSFER_NOT_FOUND");

      await transaction.fellowshipLeadershipTransfer.update({
        where: { id: transfer.id },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await createNotice(transaction, {
        userId: transfer.targetUserId,
        type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
        dedupeKey: `fellowship-transfer-cancelled:${transfer.id}:${transfer.targetUserId}`,
        payload: {
          event: "CANCELLED",
          fellowshipSlug: transfer.fellowship.slug,
          fellowshipName: transfer.fellowship.name,
        },
      });
      return transfer.fellowship;
    }, transactionOptions);
  },

  /** Starts an immediately hidden but seven-day cancellable Fellowship closure. */
  async scheduleDissolution(
    leaderId: string,
    fellowshipId: string,
    confirmationName: string,
  ): Promise<{ dissolutionId: string; slug: string; name: string; cancellationDeadline: Date }> {
    return prisma.$transaction(async (transaction) => {
      await lockFellowship(transaction, fellowshipId);
      const fellowship = await transaction.fellowship.findFirst({
        where: {
          id: fellowshipId,
          createdById: leaderId,
          dissolutions: {
            none: { status: { in: ["SCHEDULED", "FORCED"] } },
          },
        },
        select: {
          slug: true,
          name: true,
          members: { select: { userId: true } },
          joinRequests: {
            where: { status: "PENDING" },
            select: { userId: true },
          },
        },
      });
      if (!fellowship) throw new FellowshipGovernanceError("NOT_LEADER");
      if (fellowship.name !== confirmationName) {
        throw new FellowshipGovernanceError("NAME_CONFIRMATION_MISMATCH");
      }

      const now = new Date();
      const cancellationDeadline = new Date(now.getTime() + DISSOLUTION_GRACE_PERIOD_MS);
      const dissolution = await transaction.fellowshipDissolution.create({
        data: {
          fellowshipId,
          initiatedById: leaderId,
          reason: "Leader-initiated closure",
          status: "SCHEDULED",
          createdAt: now,
          cancellationDeadline,
        },
        select: { id: true },
      });

      const pendingTransfers =
        await transaction.fellowshipLeadershipTransfer.findMany({
          where: { fellowshipId, status: "PENDING" },
          select: { id: true, fromLeaderId: true, targetUserId: true },
        });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: { fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: now },
      });
      await transaction.fellowshipJoinRequest.updateMany({
        where: { fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: now },
      });
      const transferRecipients = new Set(
        pendingTransfers.flatMap((transfer) => [
          transfer.fromLeaderId,
          transfer.targetUserId,
        ]),
      );
      if (pendingTransfers.length > 0) {
        await transaction.userNotification.createMany({
          data: pendingTransfers.flatMap((transfer) =>
            Array.from(
              new Set([transfer.fromLeaderId, transfer.targetUserId]),
              (userId) => ({
                userId,
                type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
                dedupeKey: `fellowship-transfer-closed:${transfer.id}:${userId}`,
                payload: {
                  event: "CANCELLED",
                  fellowshipSlug: fellowship.slug,
                  fellowshipName: fellowship.name,
                },
              }),
            ),
          ),
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: leaderId,
          action: "FELLOWSHIP_DISSOLUTION_SCHEDULED",
          entityType: "Fellowship",
          entityId: fellowshipId,
          metadata: {
            dissolutionId: dissolution.id,
            cancellationDeadline: cancellationDeadline.toISOString(),
          },
        },
      });

      const affectedUserIds = new Set([
        ...fellowship.members.map((member) => member.userId),
        ...fellowship.joinRequests.map((request) => request.userId),
        ...transferRecipients,
      ]);
      await transaction.userNotification.createMany({
        data: Array.from(affectedUserIds, (userId) => ({
          userId,
          type: UserNotificationType.FELLOWSHIP_CLOSING,
          dedupeKey: `fellowship-closing:${dissolution.id}:${userId}`,
          payload: {
            event: "SCHEDULED",
            fellowshipSlug: fellowship.slug,
            fellowshipName: fellowship.name,
            cancellationDeadline: cancellationDeadline.toISOString(),
          },
        })),
      });

      return { dissolutionId: dissolution.id, ...fellowship, cancellationDeadline };
    }, transactionOptions);
  },

  /** Reverses a leader's closure only before its stored deadline. */
  async cancelDissolution(
    leaderId: string,
    dissolutionId: string,
  ): Promise<{ slug: string; name: string }> {
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.fellowshipDissolution.findUnique({
        where: { id: dissolutionId },
        select: { fellowshipId: true },
      });
      if (!initial) throw new FellowshipGovernanceError("DISSOLUTION_NOT_CANCELABLE");

      await lockFellowship(transaction, initial.fellowshipId);
      const dissolution = await transaction.fellowshipDissolution.findFirst({
        where: {
          id: dissolutionId,
          initiatedById: leaderId,
          status: "SCHEDULED",
          cancellationDeadline: { gt: new Date() },
          fellowship: { createdById: leaderId },
        },
        select: {
          id: true,
          fellowshipId: true,
          fellowship: {
            select: {
              slug: true,
              name: true,
              members: { select: { userId: true } },
            },
          },
        },
      });
      if (!dissolution) {
        throw new FellowshipGovernanceError("DISSOLUTION_NOT_CANCELABLE");
      }

      await transaction.fellowshipDissolution.update({
        where: { id: dissolution.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      const originalRecipients = await transaction.userNotification.findMany({
        where: {
          dedupeKey: { startsWith: `fellowship-closing:${dissolution.id}:` },
        },
        select: { userId: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: leaderId,
          action: "FELLOWSHIP_DISSOLUTION_CANCELLED",
          entityType: "Fellowship",
          entityId: dissolution.fellowshipId,
          metadata: { dissolutionId: dissolution.id },
        },
      });
      const recipients = new Set([
        ...dissolution.fellowship.members.map((member) => member.userId),
        ...originalRecipients.map((notice) => notice.userId),
      ]);
      await transaction.userNotification.createMany({
        data: Array.from(recipients, (userId) => ({
          userId,
          type: UserNotificationType.FELLOWSHIP_CLOSING,
          dedupeKey: `fellowship-closure-cancelled:${dissolution.id}:${userId}`,
          payload: {
            event: "CANCELLED",
            fellowshipSlug: dissolution.fellowship.slug,
            fellowshipName: dissolution.fellowship.name,
          },
        })),
      });

      return dissolution.fellowship;
    }, transactionOptions);
  },

  /** Performs reasoned, immediate leadership recovery for a Super Admin. */
  async emergencyTransferLeadership(input: {
    adminId: string;
    fellowshipId: string;
    targetMembershipId: string;
    confirmationName: string;
    reason: string;
  }): Promise<{ slug: string; name: string }> {
    return prisma.$transaction(async (transaction) => {
      await lockFellowship(transaction, input.fellowshipId);
      const fellowship = await transaction.fellowship.findFirst({
        where: {
          id: input.fellowshipId,
          dissolutions: {
            none: { status: { in: ["SCHEDULED", "FORCED"] } },
          },
        },
        select: { slug: true, name: true, createdById: true },
      });
      if (!fellowship) throw new FellowshipGovernanceError("FELLOWSHIP_CLOSED");
      if (fellowship.name !== input.confirmationName) {
        throw new FellowshipGovernanceError("NAME_CONFIRMATION_MISMATCH");
      }

      const target = await transaction.fellowshipMember.findFirst({
        where: {
          id: input.targetMembershipId,
          fellowshipId: input.fellowshipId,
          userId: { not: fellowship.createdById },
        },
        select: { userId: true },
      });
      if (!target) throw new FellowshipGovernanceError("MEMBER_NOT_FOUND");

      const transfer = await transaction.fellowshipLeadershipTransfer.create({
        data: {
          fellowshipId: input.fellowshipId,
          fromLeaderId: fellowship.createdById,
          targetUserId: target.userId,
          status: "ACCEPTED",
          resolvedAt: new Date(),
        },
        select: { id: true },
      });
      await transaction.fellowship.update({
        where: { id: input.fellowshipId },
        data: { createdById: target.userId },
      });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: {
          fellowshipId: input.fellowshipId,
          status: "PENDING",
          id: { not: transfer.id },
        },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "FELLOWSHIP_EMERGENCY_LEADERSHIP_TRANSFER",
          entityType: "Fellowship",
          entityId: input.fellowshipId,
          metadata: {
            reason: input.reason,
            previousLeaderId: fellowship.createdById,
            newLeaderId: target.userId,
            transferId: transfer.id,
          },
        },
      });
      await createNotice(transaction, {
        userId: target.userId,
        type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
        dedupeKey: `fellowship-admin-transfer:${transfer.id}:${target.userId}`,
        payload: {
          event: "BECAME_LEADER",
          fellowshipSlug: fellowship.slug,
          fellowshipName: fellowship.name,
        },
      });
      await createNotice(transaction, {
        userId: fellowship.createdById,
        type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
        dedupeKey: `fellowship-admin-transfer:${transfer.id}:${fellowship.createdById}`,
        payload: {
          event: "ADMIN_TRANSFERRED",
          fellowshipSlug: fellowship.slug,
          fellowshipName: fellowship.name,
        },
      });

      return { slug: fellowship.slug, name: fellowship.name };
    }, transactionOptions);
  },

  /** Immediately closes an active Fellowship as a reasoned Super Admin action. */
  async emergencyDissolution(input: {
    adminId: string;
    fellowshipId: string;
    confirmationName: string;
    reason: string;
  }): Promise<{ slug: string; name: string }> {
    return prisma.$transaction(async (transaction) => {
      await lockFellowship(transaction, input.fellowshipId);
      const fellowship = await transaction.fellowship.findFirst({
        where: {
          id: input.fellowshipId,
          dissolutions: {
            none: { status: { in: ["SCHEDULED", "FORCED"] } },
          },
        },
        select: {
          slug: true,
          name: true,
          createdById: true,
          members: { select: { userId: true } },
          joinRequests: {
            where: { status: "PENDING" },
            select: { userId: true },
          },
        },
      });
      if (!fellowship) throw new FellowshipGovernanceError("FELLOWSHIP_CLOSED");
      if (fellowship.name !== input.confirmationName) {
        throw new FellowshipGovernanceError("NAME_CONFIRMATION_MISMATCH");
      }

      const dissolution = await transaction.fellowshipDissolution.create({
        data: {
          fellowshipId: input.fellowshipId,
          initiatedById: input.adminId,
          reason: input.reason,
          status: "FORCED",
        },
        select: { id: true },
      });
      const pendingTransfers =
        await transaction.fellowshipLeadershipTransfer.findMany({
          where: { fellowshipId: input.fellowshipId, status: "PENDING" },
          select: { id: true, fromLeaderId: true, targetUserId: true },
        });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: { fellowshipId: input.fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await transaction.fellowshipJoinRequest.updateMany({
        where: { fellowshipId: input.fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      const transferRecipients = new Set(
        pendingTransfers.flatMap((transfer) => [
          transfer.fromLeaderId,
          transfer.targetUserId,
        ]),
      );
      if (pendingTransfers.length > 0) {
        await transaction.userNotification.createMany({
          data: pendingTransfers.flatMap((transfer) =>
            Array.from(
              new Set([transfer.fromLeaderId, transfer.targetUserId]),
              (userId) => ({
                userId,
                type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
                dedupeKey: `fellowship-transfer-closed:${transfer.id}:${userId}`,
                payload: {
                  event: "CANCELLED",
                  fellowshipSlug: fellowship.slug,
                  fellowshipName: fellowship.name,
                },
              }),
            ),
          ),
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "FELLOWSHIP_EMERGENCY_DISSOLUTION",
          entityType: "Fellowship",
          entityId: input.fellowshipId,
          metadata: {
            reason: input.reason,
            dissolutionId: dissolution.id,
          },
        },
      });
      const affectedUserIds = new Set([
        ...fellowship.members.map((member) => member.userId),
        ...fellowship.joinRequests.map((request) => request.userId),
        ...transferRecipients,
      ]);
      await transaction.userNotification.createMany({
        data: Array.from(affectedUserIds, (userId) => ({
          userId,
          type: UserNotificationType.FELLOWSHIP_CLOSING,
          dedupeKey: `fellowship-forced-closure:${dissolution.id}:${userId}`,
          payload: {
            event: "CLOSED",
            fellowshipSlug: fellowship.slug,
            fellowshipName: fellowship.name,
          },
        })),
      });

      return { slug: fellowship.slug, name: fellowship.name };
    }, transactionOptions);
  },

  /** Loads a bounded, email-free roster for Super Admin recovery decisions. */
  async getModerationList(query: string): Promise<FellowshipModerationItem[]> {
    const normalizedQuery = query.trim().slice(0, 50);
    const rows = await prisma.fellowship.findMany({
      where: normalizedQuery
        ? { name: { contains: normalizedQuery, mode: "insensitive" } }
        : undefined,
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        name: true,
        createdById: true,
        isPublic: true,
        createdBy: {
          select: { profile: { select: { displayName: true } } },
        },
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            id: true,
            userId: true,
            user: { select: { profile: { select: { displayName: true } } } },
          },
        },
        dissolutions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            reason: true,
            status: true,
            createdAt: true,
            cancellationDeadline: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      isPublic: row.isPublic,
      leaderDisplayName:
        row.members.find((member) => member.userId === row.createdById)?.user
          .profile?.displayName ?? "Player",
      memberCount: row.members.length,
      transferCandidates: row.members
        .filter((member) => member.userId !== row.createdById)
        .map((member) => ({
          membershipId: member.id,
          displayName: member.user.profile?.displayName ?? "Player",
        })),
      closure: row.dissolutions[0]
        ? {
            reason: row.dissolutions[0].reason,
            status: row.dissolutions[0].status,
            createdAt: row.dissolutions[0].createdAt,
            cancellationDeadline: row.dissolutions[0].cancellationDeadline,
          }
        : null,
    }));
  },
} as const;
