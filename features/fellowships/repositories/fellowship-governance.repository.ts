import type { Prisma } from "@/lib/generated/prisma/client";
import { UserNotificationType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  FellowshipConflictCode,
  FellowshipModerationItem,
} from "@/features/fellowships/types/fellowship.types";

const transactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;
const DISSOLUTION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const SUSPENSION_APPEAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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
          suspensions: { none: { status: "ACTIVE" } },
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
            suspensions: { none: { status: "ACTIVE" } },
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
          fellowship: {
            createdById: leaderId,
            suspensions: { none: { status: "ACTIVE" } },
          },
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
          suspensions: { none: { status: "ACTIVE" } },
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

  /**
   * Starts a non-destructive platform suspension. The Fellowship advisory lock
   * serializes this transition against joins, closure, and leadership changes;
   * the partial unique index is the final guard against two active cases. One
   * transaction stores the case and deadline, cancels pending requests/offers,
   * updates the parent row, records the reason in the audit log, and notifies
   * current members. It deliberately does not remove memberships or progress.
   */
  async suspendFellowship(input: {
    adminId: string;
    fellowshipId: string;
    confirmationName: string;
    reason: string;
  }): Promise<{ slug: string; name: string; suspensionId: string }> {
    return prisma.$transaction(async (transaction) => {
      await lockFellowship(transaction, input.fellowshipId);
      const existingSuspension = await transaction.fellowshipSuspension.findFirst({
        where: { fellowshipId: input.fellowshipId, status: "ACTIVE" },
        select: { id: true },
      });
      if (existingSuspension) {
        throw new FellowshipGovernanceError("FELLOWSHIP_SUSPENDED");
      }
      const fellowship = await transaction.fellowship.findFirst({
        where: {
          id: input.fellowshipId,
          dissolutions: { none: { status: { in: ["SCHEDULED", "FORCED"] } } },
          suspensions: { none: { status: "ACTIVE" } },
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
      if (!fellowship) {
        throw new FellowshipGovernanceError("FELLOWSHIP_CLOSED");
      }
      if (fellowship.name !== input.confirmationName) {
        throw new FellowshipGovernanceError("NAME_CONFIRMATION_MISMATCH");
      }

      const now = new Date();
      const appealDeadline = new Date(
        now.getTime() + SUSPENSION_APPEAL_WINDOW_MS,
      );
      const suspension = await transaction.fellowshipSuspension.create({
        data: {
          fellowshipId: input.fellowshipId,
          suspendedById: input.adminId,
          reason: input.reason,
          createdAt: now,
          appealDeadline,
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
        data: { status: "CANCELLED", resolvedAt: now },
      });
      await transaction.fellowshipJoinRequest.updateMany({
        where: { fellowshipId: input.fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: now },
      });
      await transaction.fellowship.update({
        where: { id: input.fellowshipId },
        data: { updatedAt: now },
      });

      if (pendingTransfers.length > 0) {
        await transaction.userNotification.createMany({
          data: pendingTransfers.flatMap((transfer) =>
            Array.from(
              new Set([transfer.fromLeaderId, transfer.targetUserId]),
              (userId) => ({
                userId,
                type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
                dedupeKey: `fellowship-transfer-suspended:${transfer.id}:${userId}`,
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
          action: "FELLOWSHIP_SUSPENDED",
          entityType: "Fellowship",
          entityId: input.fellowshipId,
          metadata: {
            suspensionId: suspension.id,
            reason: input.reason,
            appealDeadline: appealDeadline.toISOString(),
          },
        },
      });
      const affectedUserIds = new Set([
        ...fellowship.members.map((member) => member.userId),
      ]);
      await transaction.userNotification.createMany({
        data: Array.from(affectedUserIds, (userId) => ({
          userId,
          type: UserNotificationType.FELLOWSHIP_SUSPENSION,
          dedupeKey: `fellowship-suspended:${suspension.id}:${userId}`,
          payload: {
            event: "SUSPENDED",
            fellowshipSlug: fellowship.slug,
            fellowshipName: fellowship.name,
          },
        })),
      });

      return { ...fellowship, suspensionId: suspension.id };
    }, transactionOptions);
  },

  /**
   * Accepts one appeal from the leader who owns the Fellowship when they submit.
   * The database uniqueness constraint enforces one appeal per suspension, and
   * the locked lookup checks that the case is still active and the stored
   * 30-day deadline has not elapsed. The appeal statement remains visible only
   * to the appellant and authorized Super Admin review screens; notices omit it.
   */
  async submitSuspensionAppeal(
    leaderId: string,
    suspensionId: string,
    statement: string,
  ): Promise<{ slug: string; name: string }> {
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.fellowshipSuspension.findUnique({
        where: { id: suspensionId },
        select: { fellowshipId: true },
      });
      if (!initial) {
        throw new FellowshipGovernanceError("SUSPENSION_NOT_FOUND");
      }
      await lockFellowship(transaction, initial.fellowshipId);

      const suspension = await transaction.fellowshipSuspension.findFirst({
        where: {
          id: suspensionId,
          status: "ACTIVE",
          appealDeadline: { gt: new Date() },
          fellowship: { createdById: leaderId },
        },
        select: {
          id: true,
          appealDeadline: true,
          suspendedById: true,
          appeal: { select: { id: true } },
          fellowship: { select: { slug: true, name: true } },
        },
      });
      if (!suspension) {
        throw new FellowshipGovernanceError("APPEAL_WINDOW_CLOSED");
      }
      if (suspension.appeal) {
        throw new FellowshipGovernanceError("APPEAL_ALREADY_SUBMITTED");
      }

      const appeal = await transaction.fellowshipSuspensionAppeal.create({
        data: {
          suspensionId: suspension.id,
          appellantId: leaderId,
          statement,
        },
        select: { id: true },
      });
      const reviewers = await transaction.user.findMany({
        where: {
          role: "SUPER_ADMIN",
          suspendedAt: null,
          id: { notIn: [leaderId, suspension.suspendedById] },
        },
        select: { id: true },
      });
      await transaction.userNotification.createMany({
        data: reviewers.map((reviewer) => ({
          userId: reviewer.id,
          type: UserNotificationType.FELLOWSHIP_APPEAL,
          dedupeKey: `fellowship-appeal-submitted:${appeal.id}:${reviewer.id}`,
          payload: {
            event: "SUBMITTED",
            fellowshipSlug: suspension.fellowship.slug,
            fellowshipName: suspension.fellowship.name,
          },
        })),
      });
      await transaction.auditLog.create({
        data: {
          actorId: leaderId,
          action: "FELLOWSHIP_SUSPENSION_APPEAL_SUBMITTED",
          entityType: "FellowshipSuspensionAppeal",
          entityId: appeal.id,
          metadata: { suspensionId: suspension.id },
        },
      });

      return suspension.fellowship;
    }, transactionOptions);
  },

  /**
   * Atomically resolves a pending appeal. The moderator must be a Super Admin
   * at the action boundary and must differ from both the suspending admin and
   * appellant. Upholding leaves the suspension active permanently; restoration
   * changes both records. The reason, decision, and notices commit together.
   */
  async resolveSuspensionAppeal(input: {
    adminId: string;
    suspensionId: string;
    decision: "RESTORE" | "UPHOLD";
    decisionReason: string;
  }): Promise<{ slug: string; name: string; restored: boolean }> {
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.fellowshipSuspension.findUnique({
        where: { id: input.suspensionId },
        select: { fellowshipId: true },
      });
      if (!initial) {
        throw new FellowshipGovernanceError("SUSPENSION_NOT_FOUND");
      }
      await lockFellowship(transaction, initial.fellowshipId);

      const suspension = await transaction.fellowshipSuspension.findFirst({
        where: {
          id: input.suspensionId,
          status: "ACTIVE",
          appeal: { is: { status: "PENDING" } },
        },
        select: {
          id: true,
          suspendedById: true,
          fellowshipId: true,
          appeal: {
            select: { id: true, appellantId: true },
          },
          fellowship: {
            select: {
              slug: true,
              name: true,
              members: { select: { userId: true } },
            },
          },
        },
      });
      if (!suspension?.appeal) {
        throw new FellowshipGovernanceError("APPEAL_NOT_PENDING");
      }
      if (
        input.adminId === suspension.suspendedById ||
        input.adminId === suspension.appeal.appellantId
      ) {
        throw new FellowshipGovernanceError("APPEAL_REVIEWER_CONFLICT");
      }

      const now = new Date();
      const restores = input.decision === "RESTORE";
      await transaction.fellowshipSuspensionAppeal.update({
        where: { id: suspension.appeal.id },
        data: {
          status: restores ? "RESTORED" : "UPHELD",
          reviewedAt: now,
          reviewerId: input.adminId,
          decisionReason: input.decisionReason,
        },
      });
      if (restores) {
        await transaction.fellowshipSuspension.update({
          where: { id: suspension.id },
          data: {
            status: "RESTORED",
            restoredAt: now,
            restoredById: input.adminId,
            restorationReason: input.decisionReason,
          },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorId: input.adminId,
          action: restores
            ? "FELLOWSHIP_SUSPENSION_APPEAL_RESTORED"
            : "FELLOWSHIP_SUSPENSION_APPEAL_UPHELD",
          entityType: "FellowshipSuspensionAppeal",
          entityId: suspension.appeal.id,
          metadata: {
            suspensionId: suspension.id,
            decisionReason: input.decisionReason,
          },
        },
      });
      if (restores) {
        await transaction.userNotification.createMany({
          data: suspension.fellowship.members.map((member) => ({
            userId: member.userId,
            type: UserNotificationType.FELLOWSHIP_SUSPENSION,
            dedupeKey: `fellowship-restored:${suspension.id}:${member.userId}`,
            payload: {
              event: "RESTORED",
              fellowshipSlug: suspension.fellowship.slug,
              fellowshipName: suspension.fellowship.name,
            },
          })),
        });
      }
      await createNotice(transaction, {
        userId: suspension.appeal.appellantId,
        type: UserNotificationType.FELLOWSHIP_APPEAL,
        dedupeKey: `fellowship-appeal-decision:${suspension.appeal.id}:${suspension.appeal.appellantId}`,
        payload: {
          event: restores ? "RESTORED" : "UPHELD",
          fellowshipSlug: suspension.fellowship.slug,
          fellowshipName: suspension.fellowship.name,
        },
      });

      return { ...suspension.fellowship, restored: restores };
    }, transactionOptions);
  },

  /**
   * Restores an active case with a reasoned Super Admin action. When an appeal
   * is pending, this path applies the same independent-review rule and closes
   * the appeal as restored in the same transaction. It refuses upheld appeals,
   * preventing an alternate restore endpoint from bypassing finality.
   */
  async restoreSuspension(input: {
    adminId: string;
    suspensionId: string;
    reason: string;
  }): Promise<{ slug: string; name: string }> {
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.fellowshipSuspension.findUnique({
        where: { id: input.suspensionId },
        select: { fellowshipId: true },
      });
      if (!initial) {
        throw new FellowshipGovernanceError("SUSPENSION_NOT_FOUND");
      }
      await lockFellowship(transaction, initial.fellowshipId);

      const suspension = await transaction.fellowshipSuspension.findFirst({
        where: { id: input.suspensionId, status: "ACTIVE" },
        select: {
          id: true,
          suspendedById: true,
          appeal: { select: { id: true, appellantId: true, status: true } },
          fellowship: {
            select: {
              id: true,
              slug: true,
              name: true,
              members: { select: { userId: true } },
            },
          },
        },
      });
      if (!suspension) {
        throw new FellowshipGovernanceError("SUSPENSION_NOT_FOUND");
      }
      if (suspension.appeal?.status === "UPHELD") {
        throw new FellowshipGovernanceError("APPEAL_NOT_PENDING");
      }
      if (
        suspension.appeal?.status === "PENDING" &&
        (input.adminId === suspension.suspendedById ||
          input.adminId === suspension.appeal.appellantId)
      ) {
        throw new FellowshipGovernanceError("APPEAL_REVIEWER_CONFLICT");
      }

      const now = new Date();
      await transaction.fellowshipSuspension.update({
        where: { id: suspension.id },
        data: {
          status: "RESTORED",
          restoredAt: now,
          restoredById: input.adminId,
          restorationReason: input.reason,
        },
      });
      if (suspension.appeal?.status === "PENDING") {
        await transaction.fellowshipSuspensionAppeal.update({
          where: { id: suspension.appeal.id },
          data: {
            status: "RESTORED",
            reviewedAt: now,
            reviewerId: input.adminId,
            decisionReason: input.reason,
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: input.adminId,
          action: "FELLOWSHIP_SUSPENSION_RESTORED",
          entityType: "FellowshipSuspension",
          entityId: suspension.id,
          metadata: {
            reason: input.reason,
            appealId: suspension.appeal?.id ?? null,
          },
        },
      });
      await transaction.userNotification.createMany({
        data: suspension.fellowship.members.map((member) => ({
          userId: member.userId,
          type: UserNotificationType.FELLOWSHIP_SUSPENSION,
          dedupeKey: `fellowship-restored:${suspension.id}:${member.userId}`,
          payload: {
            event: "RESTORED",
            fellowshipSlug: suspension.fellowship.slug,
            fellowshipName: suspension.fellowship.name,
          },
        })),
      });
      if (suspension.appeal?.status === "PENDING") {
        await createNotice(transaction, {
          userId: suspension.appeal.appellantId,
          type: UserNotificationType.FELLOWSHIP_APPEAL,
          dedupeKey: `fellowship-appeal-decision:${suspension.appeal.id}:${suspension.appeal.appellantId}`,
          payload: {
            event: "RESTORED",
            fellowshipSlug: suspension.fellowship.slug,
            fellowshipName: suspension.fellowship.name,
          },
        });
      }
      return suspension.fellowship;
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
          suspensions: { none: { status: "ACTIVE" } },
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
          suspensions: { none: { status: "ACTIVE" } },
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
        suspensions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
            appealDeadline: true,
            suspendedById: true,
            suspendedBy: {
              select: { profile: { select: { displayName: true } } },
            },
            appeal: {
              select: {
                id: true,
                appellantId: true,
                statement: true,
                status: true,
                submittedAt: true,
                reviewedAt: true,
                decisionReason: true,
                reviewerId: true,
                appellant: {
                  select: { profile: { select: { displayName: true } } },
                },
              },
            },
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
      suspension: row.suspensions[0]
        ? {
            id: row.suspensions[0].id,
            reason: row.suspensions[0].reason,
            status: row.suspensions[0].status,
            createdAt: row.suspensions[0].createdAt,
            appealDeadline: row.suspensions[0].appealDeadline,
            suspendedById: row.suspensions[0].suspendedById,
            suspendedByDisplayName:
              row.suspensions[0].suspendedBy.profile?.displayName ?? "Player",
            appeal: row.suspensions[0].appeal
              ? {
                  id: row.suspensions[0].appeal.id,
                  appellantDisplayName:
                    row.suspensions[0].appeal.appellant.profile?.displayName ?? "Player",
                  appellantId: row.suspensions[0].appeal.appellantId,
                  statement: row.suspensions[0].appeal.statement,
                  status: row.suspensions[0].appeal.status,
                  submittedAt: row.suspensions[0].appeal.submittedAt,
                  decisionReason: row.suspensions[0].appeal.decisionReason,
                  reviewedAt: row.suspensions[0].appeal.reviewedAt,
                  reviewerId: row.suspensions[0].appeal.reviewerId,
                }
              : null,
          }
        : null,
    }));
  },
} as const;
