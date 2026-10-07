import type { Prisma } from "@/lib/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { UserNotificationType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  FellowshipConflictCode,
  FellowshipModerationListItem,
  FellowshipModerationItem,
  FellowshipModerationPage,
  FellowshipModerationStatus,
  FellowshipGovernanceHistoryEvent,
} from "@/features/fellowships/types/fellowship.types";
import type { FellowshipCaseFilters } from "@/features/fellowships/schemas/fellowship-case-filters.schema";
import type {
  FellowshipGovernanceCaseDetail,
  FellowshipGovernanceCasePage,
} from "@/features/fellowships/types/fellowship-case.types";

const transactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;
const DISSOLUTION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const SUSPENSION_APPEAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Creates a globally unique, sequential case number without a race between admins. */
async function createGovernanceCase(
  transaction: Prisma.TransactionClient,
  input: {
    kind: "TRANSFER" | "SUSPENSION" | "CLOSURE";
    currentStatus: string;
    fellowshipId: string;
    openedById: string;
  },
): Promise<{ id: string; caseNumber: string }> {
  const created = await transaction.fellowshipGovernanceCase.create({
    data: {
      ...input,
      // WHY: The database sequence is allocated by this insert. A temporary
      // unique value lets the final human-readable number use that sequence in
      // the same transaction, while concurrent transactions remain collision-safe.
      caseNumber: `TEMP-${randomUUID()}`,
    },
    select: { id: true, caseSequence: true },
  });
  const caseNumber = `FEL-${String(created.caseSequence).padStart(6, "0")}`;
  await transaction.fellowshipGovernanceCase.update({
    where: { id: created.id },
    data: { caseNumber },
  });
  return { id: created.id, caseNumber };
}

/** Writes one immutable audit event and ties it to its searchable case. */
async function writeCaseAudit(
  transaction: Prisma.TransactionClient,
  input: {
    governanceCaseId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      ...input,
      governanceCaseId: input.governanceCaseId,
    },
  });
}

/** Reads only approved explanatory strings from JSON audit metadata. */
function getCaseEventSummary(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const values = [metadata.reason, metadata.decisionReason];
  const summary = values.find((value): value is string => typeof value === "string");
  if (summary) return summary;

  if (metadata.legacyRecord === true && typeof metadata.status === "string") {
    return `Historical transfer status recorded as ${metadata.status.toLowerCase()}.`;
  }
  if (Array.isArray(metadata.cancelledTransferCaseNumbers)) {
    const caseNumbers = metadata.cancelledTransferCaseNumbers.filter(
      (value): value is string => typeof value === "string",
    );
    if (caseNumbers.length > 0) {
      return `Also cancelled pending transfer cases: ${caseNumbers.join(", ")}.`;
    }
  }
  if (typeof metadata.cancellationDeadline === "string") {
    return `Cancellation deadline: ${metadata.cancellationDeadline}.`;
  }
  return null;
}

/** Turns stable audit action identifiers into readable timeline labels. */
function formatCaseAction(action: string): string {
  return action
    .replace(/^FELLOWSHIP_/, "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Returns one bounded and searchable page of Fellowship governance cases. */
async function getGovernanceCasePage(
  filters: FellowshipCaseFilters,
): Promise<FellowshipGovernanceCasePage> {
  const query = filters.query.trim();
  const where: Prisma.FellowshipGovernanceCaseWhereInput = {
    ...(filters.fellowshipId ? { fellowshipId: filters.fellowshipId } : {}),
    ...(filters.kind !== "ALL" ? { kind: filters.kind } : {}),
    ...(filters.status !== "ALL" ? { currentStatus: filters.status } : {}),
    ...(query
      ? {
          OR: [
            { caseNumber: { contains: query, mode: "insensitive" } },
            { fellowship: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const pageSize = 25;
  const [cases, total] = await prisma.$transaction([
    prisma.fellowshipGovernanceCase.findMany({
      where,
      orderBy: [{ openedAt: "desc" }, { caseSequence: "desc" }],
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        caseNumber: true,
        kind: true,
        currentStatus: true,
        openedAt: true,
        fellowship: { select: { name: true } },
        openedBy: {
          select: {
            name: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    }),
    prisma.fellowshipGovernanceCase.count({ where }),
  ]);

  return {
    total,
    pageSize,
    items: cases.map(({ fellowship, openedBy, ...governanceCase }) => ({
      ...governanceCase,
      fellowshipName: fellowship.name,
      openedByName:
        openedBy.profile?.displayName || openedBy.name || "Removed account",
    })),
  };
}

/** Loads the full case timeline while withholding raw metadata and private IDs. */
async function getGovernanceCaseDetail(
  caseNumber: string,
): Promise<FellowshipGovernanceCaseDetail | null> {
  const governanceCase = await prisma.fellowshipGovernanceCase.findUnique({
    where: { caseNumber },
    select: {
      id: true,
      caseNumber: true,
      kind: true,
      currentStatus: true,
      openedAt: true,
      fellowship: { select: { name: true } },
      openedBy: {
        select: {
          name: true,
          profile: { select: { displayName: true } },
        },
      },
      transfer: {
        select: {
          fromLeader: {
            select: {
              name: true,
              profile: { select: { displayName: true } },
            },
          },
          targetUser: {
            select: {
              name: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      },
      dissolution: { select: { reason: true } },
      suspension: {
        select: {
          reason: true,
          appeal: {
            select: {
              statement: true,
              decisionReason: true,
              appellant: {
                select: {
                  name: true,
                  profile: { select: { displayName: true } },
                },
              },
            },
          },
        },
      },
      auditLogs: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          actor: {
            select: {
              name: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      },
    },
  });
  if (!governanceCase) return null;

  const participants = governanceCase.transfer
    ? [
        governanceCase.transfer.fromLeader.profile?.displayName ||
          governanceCase.transfer.fromLeader.name ||
          "Previous leader",
        governanceCase.transfer.targetUser.profile?.displayName ||
          governanceCase.transfer.targetUser.name ||
          "Transfer recipient",
      ]
    : governanceCase.suspension?.appeal
      ? [
          governanceCase.suspension.appeal.appellant.profile?.displayName ||
            governanceCase.suspension.appeal.appellant.name ||
            "Appealing leader",
        ]
      : [];
  const appeal = governanceCase.suspension?.appeal;
  const events = governanceCase.auditLogs.map((event) => ({
    id: event.id,
    action: formatCaseAction(event.action),
    createdAt: event.createdAt,
    actorName:
      event.actor?.profile?.displayName ||
      event.actor?.name ||
      "System or removed account",
    summary: getCaseEventSummary(event.metadata),
  }));
  if (appeal?.statement) {
    const appealEvent = events.find((event) =>
      event.action.includes("Suspension Appeal Submitted"),
    );
    if (appealEvent) {
      appealEvent.summary = `Appeal statement: ${appeal.statement}`;
    }
  }

  return {
    id: governanceCase.id,
    caseNumber: governanceCase.caseNumber,
    kind: governanceCase.kind,
    currentStatus: governanceCase.currentStatus,
    openedAt: governanceCase.openedAt,
    fellowshipName: governanceCase.fellowship.name,
    openedByName:
      governanceCase.openedBy.profile?.displayName ||
      governanceCase.openedBy.name ||
      "Removed account",
    reason:
      governanceCase.suspension?.reason ??
      governanceCase.dissolution?.reason ??
      null,
    participants,
    events,
  };
}

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
  getCasePage: getGovernanceCasePage,
  getCaseDetail: getGovernanceCaseDetail,

  /** Creates a leader-initiated offer to an existing member. */
  async requestLeadershipTransfer(
    leaderId: string,
    fellowshipId: string,
    targetMembershipId: string,
  ): Promise<{ transferId: string; caseNumber: string; slug: string; name: string }> {
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

      const governanceCase = await createGovernanceCase(transaction, {
        kind: "TRANSFER",
        currentStatus: "PENDING",
        fellowshipId,
        openedById: leaderId,
      });
      const transfer = await transaction.fellowshipLeadershipTransfer.create({
        data: {
          fellowshipId,
          fromLeaderId: leaderId,
          targetUserId: target.userId,
          governanceCaseId: governanceCase.id,
        },
        select: { id: true },
      });
      await writeCaseAudit(transaction, {
        governanceCaseId: governanceCase.id,
        actorId: leaderId,
        action: "FELLOWSHIP_LEADERSHIP_TRANSFER_REQUESTED",
        entityType: "FellowshipLeadershipTransfer",
        entityId: transfer.id,
        metadata: { caseNumber: governanceCase.caseNumber },
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

      return {
        transferId: transfer.id,
        caseNumber: governanceCase.caseNumber,
        ...fellowship,
      };
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
          governanceCaseId: true,
          targetUser: {
            select: { profile: { select: { displayName: true } } },
          },
          fellowship: {
            select: {
              slug: true,
              name: true,
              createdById: true,
              members: {
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          },
        },
      });
      if (!transfer || transfer.fellowship.createdById !== transfer.fromLeaderId) {
        throw new FellowshipGovernanceError("TRANSFER_NOT_FOUND");
      }
      if (
        transfer.fellowship.members.filter(
          (member) => member.userId === recipientId,
        ).length !== 1
      ) {
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
      await transaction.fellowshipGovernanceCase.update({
        where: { id: transfer.governanceCaseId },
        data: { currentStatus: accepted ? "ACCEPTED" : "DECLINED" },
      });

      if (accepted) {
        await transaction.fellowship.update({
          where: { id: transfer.fellowshipId },
          data: { createdById: recipientId },
        });
      }
      await writeCaseAudit(transaction, {
        governanceCaseId: transfer.governanceCaseId,
        actorId: recipientId,
        action: accepted
          ? "FELLOWSHIP_LEADERSHIP_TRANSFER_ACCEPTED"
          : "FELLOWSHIP_LEADERSHIP_TRANSFER_DECLINED",
        entityType: "FellowshipLeadershipTransfer",
        entityId: transfer.id,
        metadata: {
          previousLeaderId: transfer.fromLeaderId,
          newLeaderId: accepted ? recipientId : null,
        },
      });

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

        const otherMembers = transfer.fellowship.members.filter(
          (member) =>
            member.userId !== transfer.fromLeaderId &&
            member.userId !== recipientId,
        );

        if (otherMembers.length > 0) {
          await transaction.userNotification.createMany({
            data: otherMembers.map((member) => ({
              userId: member.userId,
              type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
              dedupeKey: `fellowship-leadership-changed:${transfer.id}:${member.userId}`,
              payload: {
                event: "LEADERSHIP_CHANGED",
                fellowshipSlug: transfer.fellowship.slug,
                fellowshipName: transfer.fellowship.name,
                leaderDisplayName:
                  transfer.targetUser.profile?.displayName ?? "Player",
              },
            })),
          });
        }
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
          governanceCaseId: true,
          targetUserId: true,
          fellowship: { select: { slug: true, name: true } },
        },
      });
      if (!transfer) throw new FellowshipGovernanceError("TRANSFER_NOT_FOUND");

      await transaction.fellowshipLeadershipTransfer.update({
        where: { id: transfer.id },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      await transaction.fellowshipGovernanceCase.update({
        where: { id: transfer.governanceCaseId },
        data: { currentStatus: "CANCELLED" },
      });
      await writeCaseAudit(transaction, {
        governanceCaseId: transfer.governanceCaseId,
        actorId: leaderId,
        action: "FELLOWSHIP_LEADERSHIP_TRANSFER_CANCELLED",
        entityType: "FellowshipLeadershipTransfer",
        entityId: transfer.id,
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
  ): Promise<{ dissolutionId: string; caseNumber: string; slug: string; name: string; cancellationDeadline: Date }> {
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
      const governanceCase = await createGovernanceCase(transaction, {
        kind: "CLOSURE",
        currentStatus: "SCHEDULED",
        fellowshipId,
        openedById: leaderId,
      });
      const dissolution = await transaction.fellowshipDissolution.create({
        data: {
          fellowshipId,
          initiatedById: leaderId,
          reason: "Leader-initiated closure",
          status: "SCHEDULED",
          createdAt: now,
          cancellationDeadline,
          governanceCaseId: governanceCase.id,
        },
        select: { id: true },
      });

      const pendingTransfers =
        await transaction.fellowshipLeadershipTransfer.findMany({
          where: { fellowshipId, status: "PENDING" },
          select: {
            id: true,
            fromLeaderId: true,
            targetUserId: true,
            governanceCaseId: true,
            governanceCase: { select: { caseNumber: true } },
          },
        });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: { fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: now },
      });
      for (const transfer of pendingTransfers) {
        await transaction.fellowshipGovernanceCase.update({
          where: { id: transfer.governanceCaseId },
          data: { currentStatus: "CANCELLED" },
        });
        await writeCaseAudit(transaction, {
          governanceCaseId: transfer.governanceCaseId,
          actorId: leaderId,
          action: "FELLOWSHIP_LEADERSHIP_TRANSFER_CANCELLED_BY_CLOSURE",
          entityType: "FellowshipLeadershipTransfer",
          entityId: transfer.id,
          metadata: { closureCaseNumber: governanceCase.caseNumber },
        });
      }
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
      await writeCaseAudit(transaction, {
        governanceCaseId: governanceCase.id,
        actorId: leaderId,
        action: "FELLOWSHIP_DISSOLUTION_SCHEDULED",
        entityType: "FellowshipDissolution",
        entityId: dissolution.id,
        metadata: {
          caseNumber: governanceCase.caseNumber,
          cancellationDeadline: cancellationDeadline.toISOString(),
          cancelledTransferCaseNumbers: pendingTransfers.map(
            (transfer) => transfer.governanceCase.caseNumber,
          ),
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

      return {
        dissolutionId: dissolution.id,
        caseNumber: governanceCase.caseNumber,
        ...fellowship,
        cancellationDeadline,
      };
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
          governanceCaseId: true,
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
      await transaction.fellowshipGovernanceCase.update({
        where: { id: dissolution.governanceCaseId },
        data: { currentStatus: "CANCELLED" },
      });
      const originalRecipients = await transaction.userNotification.findMany({
        where: {
          dedupeKey: { startsWith: `fellowship-closing:${dissolution.id}:` },
        },
        select: { userId: true },
      });
      await writeCaseAudit(transaction, {
        governanceCaseId: dissolution.governanceCaseId,
        actorId: leaderId,
        action: "FELLOWSHIP_DISSOLUTION_CANCELLED",
        entityType: "FellowshipDissolution",
        entityId: dissolution.id,
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
  }): Promise<{
    slug: string;
    name: string;
    suspensionId: string;
    caseNumber: string;
  }> {
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
      const governanceCase = await createGovernanceCase(transaction, {
        kind: "SUSPENSION",
        currentStatus: "ACTIVE",
        fellowshipId: input.fellowshipId,
        openedById: input.adminId,
      });
      const suspension = await transaction.fellowshipSuspension.create({
        data: {
          fellowshipId: input.fellowshipId,
          suspendedById: input.adminId,
          reason: input.reason,
          createdAt: now,
          appealDeadline,
          governanceCaseId: governanceCase.id,
        },
        select: { id: true },
      });
      const pendingTransfers =
        await transaction.fellowshipLeadershipTransfer.findMany({
          where: { fellowshipId: input.fellowshipId, status: "PENDING" },
          select: {
            id: true,
            fromLeaderId: true,
            targetUserId: true,
            governanceCaseId: true,
            governanceCase: { select: { caseNumber: true } },
          },
        });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: { fellowshipId: input.fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: now },
      });
      for (const transfer of pendingTransfers) {
        await transaction.fellowshipGovernanceCase.update({
          where: { id: transfer.governanceCaseId },
          data: { currentStatus: "CANCELLED" },
        });
        await writeCaseAudit(transaction, {
          governanceCaseId: transfer.governanceCaseId,
          actorId: input.adminId,
          action: "FELLOWSHIP_LEADERSHIP_TRANSFER_CANCELLED_BY_SUSPENSION",
          entityType: "FellowshipLeadershipTransfer",
          entityId: transfer.id,
          metadata: { suspensionCaseNumber: governanceCase.caseNumber },
        });
      }
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

      await writeCaseAudit(transaction, {
        governanceCaseId: governanceCase.id,
        actorId: input.adminId,
        action: "FELLOWSHIP_SUSPENDED",
        entityType: "FellowshipSuspension",
        entityId: suspension.id,
        metadata: {
          caseNumber: governanceCase.caseNumber,
          reason: input.reason,
          appealDeadline: appealDeadline.toISOString(),
          cancelledTransferCaseNumbers: pendingTransfers.map(
            (transfer) => transfer.governanceCase.caseNumber,
          ),
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

      return {
        ...fellowship,
        suspensionId: suspension.id,
        caseNumber: governanceCase.caseNumber,
      };
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
          governanceCaseId: true,
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
      await writeCaseAudit(transaction, {
        governanceCaseId: suspension.governanceCaseId,
        actorId: leaderId,
        action: "FELLOWSHIP_SUSPENSION_APPEAL_SUBMITTED",
        entityType: "FellowshipSuspensionAppeal",
        entityId: appeal.id,
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
          governanceCaseId: true,
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

      if (restores) {
        await transaction.fellowshipGovernanceCase.update({
          where: { id: suspension.governanceCaseId },
          data: { currentStatus: "RESTORED" },
        });
      } else {
        await transaction.fellowshipGovernanceCase.update({
          where: { id: suspension.governanceCaseId },
          data: { currentStatus: "UPHELD" },
        });
      }
      await writeCaseAudit(transaction, {
        governanceCaseId: suspension.governanceCaseId,
        actorId: input.adminId,
        action: restores
          ? "FELLOWSHIP_SUSPENSION_APPEAL_RESTORED"
          : "FELLOWSHIP_SUSPENSION_APPEAL_UPHELD",
        entityType: "FellowshipSuspensionAppeal",
        entityId: suspension.appeal.id,
        metadata: { decisionReason: input.decisionReason },
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
          governanceCaseId: true,
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
      await transaction.fellowshipGovernanceCase.update({
        where: { id: suspension.governanceCaseId },
        data: { currentStatus: "RESTORED" },
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
      await writeCaseAudit(transaction, {
        governanceCaseId: suspension.governanceCaseId,
        actorId: input.adminId,
        action: "FELLOWSHIP_SUSPENSION_RESTORED",
        entityType: "FellowshipSuspension",
        entityId: suspension.id,
        metadata: {
          reason: input.reason,
          appealId: suspension.appeal?.id ?? null,
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
  }): Promise<{ slug: string; name: string; caseNumber: string }> {
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
          members: {
            select: {
              userId: true,
            },
          },
        },
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
        select: {
          userId: true,
          user: { select: { profile: { select: { displayName: true } } } },
        },
      });
      if (!target) throw new FellowshipGovernanceError("MEMBER_NOT_FOUND");

      const governanceCase = await createGovernanceCase(transaction, {
        kind: "TRANSFER",
        currentStatus: "ACCEPTED",
        fellowshipId: input.fellowshipId,
        openedById: input.adminId,
      });
      const transfer = await transaction.fellowshipLeadershipTransfer.create({
        data: {
          fellowshipId: input.fellowshipId,
          fromLeaderId: fellowship.createdById,
          targetUserId: target.userId,
          status: "ACCEPTED",
          resolvedAt: new Date(),
          governanceCaseId: governanceCase.id,
        },
        select: { id: true },
      });
      await transaction.fellowship.update({
        where: { id: input.fellowshipId },
        data: { createdById: target.userId },
      });
      const cancelledTransfers = await transaction.fellowshipLeadershipTransfer.findMany({
        where: {
          fellowshipId: input.fellowshipId,
          status: "PENDING",
          id: { not: transfer.id },
        },
        select: {
          id: true,
          governanceCaseId: true,
          governanceCase: { select: { caseNumber: true } },
        },
      });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: {
          fellowshipId: input.fellowshipId,
          status: "PENDING",
          id: { not: transfer.id },
        },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      for (const cancelledTransfer of cancelledTransfers) {
        await transaction.fellowshipGovernanceCase.update({
          where: { id: cancelledTransfer.governanceCaseId },
          data: { currentStatus: "CANCELLED" },
        });
        await writeCaseAudit(transaction, {
          governanceCaseId: cancelledTransfer.governanceCaseId,
          actorId: input.adminId,
          action: "FELLOWSHIP_LEADERSHIP_TRANSFER_CANCELLED_BY_TRANSFER",
          entityType: "FellowshipLeadershipTransfer",
          entityId: cancelledTransfer.id,
          metadata: { replacementCaseNumber: governanceCase.caseNumber },
        });
      }
      await writeCaseAudit(transaction, {
        governanceCaseId: governanceCase.id,
        actorId: input.adminId,
        action: "FELLOWSHIP_EMERGENCY_LEADERSHIP_TRANSFER",
        entityType: "FellowshipLeadershipTransfer",
        entityId: transfer.id,
        metadata: {
          caseNumber: governanceCase.caseNumber,
          reason: input.reason,
          previousLeaderId: fellowship.createdById,
          newLeaderId: target.userId,
          cancelledTransferCaseNumbers: cancelledTransfers.map(
            (cancelledTransfer) =>
              cancelledTransfer.governanceCase.caseNumber,
          ),
        },
      });
      await createNotice(transaction, {
        userId: target.userId,
        type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
        dedupeKey: `fellowship-admin-transfer:${transfer.id}:${target.userId}`,
        payload: {
          event: "ADMIN_TRANSFER_RECEIVED",
          fellowshipSlug: fellowship.slug,
          fellowshipName: fellowship.name,
          reason: input.reason,
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
      const otherMembers = fellowship.members.filter(
        (member) =>
          member.userId !== fellowship.createdById &&
          member.userId !== target.userId,
      );

      if (otherMembers.length > 0) {
        await transaction.userNotification.createMany({
          data: otherMembers.map((member) => ({
            userId: member.userId,
            type: UserNotificationType.FELLOWSHIP_LEADERSHIP,
            dedupeKey: `fellowship-leadership-changed:${transfer.id}:${member.userId}`,
            payload: {
              event: "LEADERSHIP_CHANGED",
              fellowshipSlug: fellowship.slug,
              fellowshipName: fellowship.name,
              leaderDisplayName:
                target.user.profile?.displayName ?? "Player",
            },
          })),
        });
      }

      return {
        slug: fellowship.slug,
        name: fellowship.name,
        caseNumber: governanceCase.caseNumber,
      };
    }, transactionOptions);
  },

  /** Immediately closes an active Fellowship as a reasoned Super Admin action. */
  async emergencyDissolution(input: {
    adminId: string;
    fellowshipId: string;
    confirmationName: string;
    reason: string;
  }): Promise<{ slug: string; name: string; caseNumber: string }> {
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

      const governanceCase = await createGovernanceCase(transaction, {
        kind: "CLOSURE",
        currentStatus: "FORCED",
        fellowshipId: input.fellowshipId,
        openedById: input.adminId,
      });
      const dissolution = await transaction.fellowshipDissolution.create({
        data: {
          fellowshipId: input.fellowshipId,
          initiatedById: input.adminId,
          reason: input.reason,
          status: "FORCED",
          governanceCaseId: governanceCase.id,
        },
        select: { id: true },
      });
      const pendingTransfers =
        await transaction.fellowshipLeadershipTransfer.findMany({
          where: { fellowshipId: input.fellowshipId, status: "PENDING" },
          select: {
            id: true,
            fromLeaderId: true,
            targetUserId: true,
            governanceCaseId: true,
          governanceCase: { select: { caseNumber: true } },
          },
        });
      await transaction.fellowshipLeadershipTransfer.updateMany({
        where: { fellowshipId: input.fellowshipId, status: "PENDING" },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      for (const transfer of pendingTransfers) {
        await transaction.fellowshipGovernanceCase.update({
          where: { id: transfer.governanceCaseId },
          data: { currentStatus: "CANCELLED" },
        });
        await writeCaseAudit(transaction, {
          governanceCaseId: transfer.governanceCaseId,
          actorId: input.adminId,
          action: "FELLOWSHIP_LEADERSHIP_TRANSFER_CANCELLED_BY_CLOSURE",
          entityType: "FellowshipLeadershipTransfer",
          entityId: transfer.id,
          metadata: { closureCaseNumber: governanceCase.caseNumber },
        });
      }
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
      await writeCaseAudit(transaction, {
        governanceCaseId: governanceCase.id,
        actorId: input.adminId,
        action: "FELLOWSHIP_EMERGENCY_DISSOLUTION",
        entityType: "FellowshipDissolution",
        entityId: dissolution.id,
        metadata: {
          caseNumber: governanceCase.caseNumber,
          reason: input.reason,
          cancelledTransferCaseNumbers: pendingTransfers.map(
            (transfer) => transfer.governanceCase.caseNumber,
          ),
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

      return {
        slug: fellowship.slug,
        name: fellowship.name,
        caseNumber: governanceCase.caseNumber,
      };
    }, transactionOptions);
  },

  /**
   * Returns a compact, searchable page without loading every member or case
   * record. Only a single result page is hydrated for the table; management
   * details and transfer candidates are loaded after an admin opens a row.
   */
  async getModerationPage(input: {
    query: string;
    status: FellowshipModerationStatus;
    page: number;
    pageSize: number;
  }): Promise<FellowshipModerationPage> {
    const normalizedQuery = input.query.trim().slice(0, 50);
    const now = new Date();
    const activeClosureCondition: Prisma.FellowshipDissolutionWhereInput = {
      OR: [
        { status: "FORCED" },
        {
          status: "SCHEDULED",
          OR: [
            { cancellationDeadline: null },
            { cancellationDeadline: { lte: now } },
          ],
        },
      ],
    };
    const statusWhere: Prisma.FellowshipWhereInput =
      input.status === "ACTIVE"
        ? {
            suspensions: { none: { status: "ACTIVE" } },
            dissolutions: { none: activeClosureCondition },
          }
        : input.status === "SUSPENDED"
          ? { suspensions: { some: { status: "ACTIVE" } } }
          : input.status === "APPEAL_PENDING"
            ? {
                suspensions: {
                  some: {
                    status: "ACTIVE",
                    appeal: { is: { status: "PENDING" } },
                  },
                },
              }
            : input.status === "CLOSING"
              ? {
                  suspensions: { none: { status: "ACTIVE" } },
                  dissolutions: {
                    some: {
                      status: "SCHEDULED",
                      cancellationDeadline: { gt: now },
                    },
                  },
                }
              : input.status === "CLOSED"
                ? {
                    suspensions: { none: { status: "ACTIVE" } },
                    dissolutions: { some: activeClosureCondition },
                  }
                : {};
    const searchWhere: Prisma.FellowshipWhereInput = normalizedQuery
      ? {
          OR: [
            { name: { contains: normalizedQuery, mode: "insensitive" } },
            {
              members: {
                some: {
                  user: {
                    profile: {
                      is: {
                        displayName: {
                          contains: normalizedQuery,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {};
    const where: Prisma.FellowshipWhereInput = {
      AND: [statusWhere, searchWhere],
    };
    const totalCount = await prisma.fellowship.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / input.pageSize));
    const page = Math.min(input.page, totalPages);
    const skip = (page - 1) * input.pageSize;
    const rows = await prisma.fellowship.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take: input.pageSize,
        select: {
          id: true,
          slug: true,
          name: true,
          isPublic: true,
          updatedAt: true,
          createdBy: {
            select: { profile: { select: { displayName: true } } },
          },
          _count: { select: { members: true } },
          dissolutions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true, cancellationDeadline: true },
          },
          suspensions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              status: true,
              appeal: { select: { status: true } },
            },
          },
        },
      });

    const items: FellowshipModerationListItem[] = rows.map((row) => {
      const latestSuspension = row.suspensions[0];
      const latestClosure = row.dissolutions[0];
      let status: FellowshipModerationListItem["status"] = "ACTIVE";

      if (latestSuspension?.status === "ACTIVE") {
        status =
          latestSuspension.appeal?.status === "PENDING"
            ? "APPEAL_PENDING"
            : "SUSPENDED";
      } else if (latestClosure?.status === "FORCED") {
        status = "CLOSED";
      } else if (latestClosure?.status === "SCHEDULED") {
        status =
          latestClosure.cancellationDeadline &&
          latestClosure.cancellationDeadline > now
            ? "CLOSING"
            : "CLOSED";
      }

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        isPublic: row.isPublic,
        memberCount: row._count.members,
        leaderDisplayName: row.createdBy.profile?.displayName ?? "Player",
        updatedAt: row.updatedAt,
        status,
      };
    });

    return {
      items,
      page,
      pageSize: input.pageSize,
      totalCount,
      totalPages,
    };
  },

  /** Loads protected governance details and transfer candidates for one row. */
  async getModerationDetail(
    fellowshipId: string,
  ): Promise<FellowshipModerationItem | null> {
    const [row, totalGovernanceLogCount] = await Promise.all([
      prisma.fellowship.findUnique({
      where: { id: fellowshipId },
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
          take: 5,
          select: {
            reason: true,
            status: true,
            createdAt: true,
            cancellationDeadline: true,
            initiatedBy: {
              select: { profile: { select: { displayName: true } } },
            },
            governanceCase: {
              select: { caseNumber: true, currentStatus: true },
            },
          },
        },
        suspensions: {
          orderBy: { createdAt: "desc" },
          take: 5,
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
                reviewer: {
                  select: { profile: { select: { displayName: true } } },
                },
                appellant: {
                  select: { profile: { select: { displayName: true } } },
                },
              },
            },
            governanceCase: {
              select: { caseNumber: true, currentStatus: true },
            },
          },
        },
        leadershipTransfers: {
          orderBy: { requestedAt: "desc" },
          take: 5,
          select: {
            status: true,
            requestedAt: true,
            fromLeader: {
              select: { profile: { select: { displayName: true } } },
            },
            targetUser: {
              select: { profile: { select: { displayName: true } } },
            },
            governanceCase: {
              select: { caseNumber: true, currentStatus: true },
            },
          },
        },
      },
      }),
      prisma.auditLog.count({
        where: {
          governanceCase: { is: { fellowshipId } },
        },
      }),
    ]);

    if (!row) return null;

    const governanceHistory: FellowshipGovernanceHistoryEvent[] = [
      ...row.leadershipTransfers.map((transfer) => ({
        kind: "LEADERSHIP_TRANSFER" as const,
        status: transfer.status,
        createdAt: transfer.requestedAt,
        actorDisplayName:
          transfer.fromLeader.profile?.displayName ?? "Player",
        targetDisplayName:
          transfer.targetUser.profile?.displayName ?? "Player",
        reason: null,
        caseNumber: transfer.governanceCase.caseNumber,
        caseStatus: transfer.governanceCase.currentStatus,
      })),
      ...row.dissolutions.map((dissolution) => ({
        kind: "CLOSURE" as const,
        status: dissolution.status,
        createdAt: dissolution.createdAt,
        actorDisplayName:
          dissolution.initiatedBy.profile?.displayName ?? "Super Admin",
        targetDisplayName: null,
        reason: dissolution.reason,
        caseNumber: dissolution.governanceCase.caseNumber,
        caseStatus: dissolution.governanceCase.currentStatus,
      })),
      ...row.suspensions.flatMap((suspension) => {
        const events: FellowshipGovernanceHistoryEvent[] = [
          {
            kind: "SUSPENSION",
            status: suspension.status,
            createdAt: suspension.createdAt,
            actorDisplayName:
              suspension.suspendedBy.profile?.displayName ?? "Super Admin",
            targetDisplayName: null,
            reason: suspension.reason,
            caseNumber: suspension.governanceCase.caseNumber,
            caseStatus: suspension.governanceCase.currentStatus,
          },
        ];
        if (suspension.appeal) {
          events.push({
            kind: "APPEAL",
            status: suspension.appeal.status,
            createdAt:
              suspension.appeal.reviewedAt ?? suspension.appeal.submittedAt,
            actorDisplayName:
              suspension.appeal.reviewer?.profile?.displayName ??
              suspension.appeal.appellant.profile?.displayName ??
              "Player",
            targetDisplayName: null,
            reason: suspension.appeal.decisionReason,
            caseNumber: suspension.governanceCase.caseNumber,
            caseStatus: suspension.governanceCase.currentStatus,
          });
        }
        return events;
      }),
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 3);

    return {
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
      governanceHistory,
      totalGovernanceLogCount,
    };
  },
} as const;
