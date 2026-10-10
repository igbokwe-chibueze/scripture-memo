/**
 * Exercises Fellowship governance races using independent PostgreSQL connections.
 *
 * The suite verifies that the shared Fellowship lock serializes duplicate
 * leadership offers and conflicting closure/suspension actions, and that a
 * suspension accepts only one concurrent appeal. It requires a migrated,
 * isolated local PostgreSQL database with at least two connections. Fixtures
 * use run-specific IDs and are deleted in foreign-key order; no existing
 * Fellowship or learner history is read for cleanup or modified.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "dotenv/config";
import { getPostgresPoolConfig } from "@/lib/database/get-postgres-pool-config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;
const singleConnectionReason =
  "Requires a multi-connection PostgreSQL test runtime; Prisma Local serializes connections.";

test(
  "concurrent Fellowship governance actions preserve one coherent case history",
  {
    skip: !testDatabaseUrl
      ? "TEST_DATABASE_URL is not configured."
      : getPostgresPoolConfig(testDatabaseUrl).max === 1
        ? singleConnectionReason
        : false,
  },
  async () => {
    if (!testDatabaseUrl) return;

    const safeTestDatabaseUrl = requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = safeTestDatabaseUrl;

    const [{ prisma }, governanceModule] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/fellowships/repositories/fellowship-governance.repository"),
    ]);
    const { fellowshipGovernanceRepository, FellowshipGovernanceError } =
      governanceModule;

    const runId = randomUUID();
    const leaderId = `governance-leader-${runId}`;
    const targetId = `governance-target-${runId}`;
    const suspendingAdminId = `governance-admin-${runId}`;
    const reviewingAdminId = `governance-reviewer-${runId}`;
    const userIds = [leaderId, targetId, suspendingAdminId, reviewingAdminId];
    const fellowshipIds = [
      `transfer-race-${runId}`,
      `closure-suspension-race-${runId}`,
      `appeal-race-${runId}`,
    ];
    const fellowshipNames = [
      `Transfer Race ${runId}`,
      `Closure Race ${runId}`,
      `Appeal Race ${runId}`,
    ];

    try {
      // Distinct actor identities let the repository exercise its actual
      // creator, member, suspender, and independent-reviewer relationships.
      await prisma.user.createMany({
        data: [
          {
            id: leaderId,
            name: "Governance Test Leader",
            email: `${leaderId}@example.test`,
          },
          {
            id: targetId,
            name: "Governance Test Member",
            email: `${targetId}@example.test`,
          },
          {
            id: suspendingAdminId,
            name: "Governance Test Super Admin",
            email: `${suspendingAdminId}@example.test`,
            role: "SUPER_ADMIN",
          },
          {
            id: reviewingAdminId,
            name: "Governance Test Appeal Reviewer",
            email: `${reviewingAdminId}@example.test`,
            role: "SUPER_ADMIN",
          },
        ],
      });

      for (const [index, fellowshipId] of fellowshipIds.entries()) {
        await prisma.fellowship.create({
          data: {
            id: fellowshipId,
            name: fellowshipNames[index],
            slug: fellowshipId,
            inviteCode: `invite-${fellowshipId}`,
            createdById: leaderId,
            isPublic: true,
            members: {
              create: [{ userId: leaderId }, { userId: targetId }],
            },
          },
        });
      }

      const targetMembership = await prisma.fellowshipMember.findFirstOrThrow({
        where: { fellowshipId: fellowshipIds[0], userId: targetId },
        select: { id: true },
      });

      // Two offers race for the same pending slot. The repository's advisory
      // lock should allow exactly one transaction to create a case and transfer.
      const transferResults = await Promise.allSettled([
        fellowshipGovernanceRepository.requestLeadershipTransfer(
          leaderId,
          fellowshipIds[0],
          targetMembership.id,
        ),
        fellowshipGovernanceRepository.requestLeadershipTransfer(
          leaderId,
          fellowshipIds[0],
          targetMembership.id,
        ),
      ]);
      assert.equal(
        transferResults.filter((result) => result.status === "fulfilled").length,
        1,
        "Only one simultaneous leadership offer should be accepted.",
      );
      const rejectedTransfer = transferResults.find(
        (result) => result.status === "rejected",
      );
      assert.ok(rejectedTransfer && rejectedTransfer.status === "rejected");
      assert.ok(rejectedTransfer.reason instanceof FellowshipGovernanceError);
      assert.equal(rejectedTransfer.reason.code, "TRANSFER_PENDING");

      const [pendingTransfers, transferCases] = await Promise.all([
        prisma.fellowshipLeadershipTransfer.count({
          where: { fellowshipId: fellowshipIds[0], status: "PENDING" },
        }),
        prisma.fellowshipGovernanceCase.count({
          where: { fellowshipId: fellowshipIds[0] },
        }),
      ]);
      assert.equal(pendingTransfers, 1);
      assert.equal(transferCases, 1);

      const successfulOffer = transferResults.find(
        (result) => result.status === "fulfilled",
      );
      assert.ok(successfulOffer && successfulOffer.status === "fulfilled");
      const originalTransferCase =
        await prisma.fellowshipGovernanceCase.findFirstOrThrow({
          where: { fellowshipId: fellowshipIds[0] },
          select: { id: true, caseNumber: true, currentStatus: true },
        });
      assert.equal(originalTransferCase.currentStatus, "PENDING");

      // Race acceptance of the same offer. Exactly one request may change the
      // fellowship leader; the losing request must not create another case or
      // split the transfer and case status into conflicting outcomes.
      const acceptanceResults = await Promise.allSettled([
        fellowshipGovernanceRepository.respondLeadershipTransfer(
          targetId,
          successfulOffer.value.transferId,
          "ACCEPT",
        ),
        fellowshipGovernanceRepository.respondLeadershipTransfer(
          targetId,
          successfulOffer.value.transferId,
          "ACCEPT",
        ),
      ]);
      assert.equal(
        acceptanceResults.filter((result) => result.status === "fulfilled").length,
        1,
        "Only one concurrent acceptance should change the Fellowship leader.",
      );
      const rejectedAcceptance = acceptanceResults.find(
        (result) => result.status === "rejected",
      );
      assert.ok(rejectedAcceptance && rejectedAcceptance.status === "rejected");
      assert.ok(rejectedAcceptance.reason instanceof FellowshipGovernanceError);

      const [updatedFellowship, updatedTransferCase, acceptedTransfer, finalTransferCases] =
        await Promise.all([
          prisma.fellowship.findUniqueOrThrow({
            where: { id: fellowshipIds[0] },
            select: { createdById: true },
          }),
          prisma.fellowshipGovernanceCase.findUniqueOrThrow({
            where: { id: originalTransferCase.id },
            select: { caseNumber: true, currentStatus: true },
          }),
          prisma.fellowshipLeadershipTransfer.findFirstOrThrow({
            where: { fellowshipId: fellowshipIds[0] },
            select: { status: true },
          }),
          prisma.fellowshipGovernanceCase.count({
            where: { fellowshipId: fellowshipIds[0] },
          }),
        ]);

      assert.equal(updatedFellowship.createdById, targetId);
      assert.equal(acceptedTransfer.status, "ACCEPTED");
      assert.equal(updatedTransferCase.currentStatus, "ACCEPTED");
      assert.equal(updatedTransferCase.caseNumber, originalTransferCase.caseNumber);
      assert.equal(finalTransferCases, 1);

      // Closure and Super Admin suspension both change availability. Racing
      // them must leave exactly one active state and one matching case record.
      const closureSuspensionResults = await Promise.allSettled([
        fellowshipGovernanceRepository.scheduleDissolution(
          leaderId,
          fellowshipIds[1],
          fellowshipNames[1],
        ),
        fellowshipGovernanceRepository.suspendFellowship({
          adminId: suspendingAdminId,
          fellowshipId: fellowshipIds[1],
          confirmationName: fellowshipNames[1],
          reason: "Concurrent governance integration test.",
        }),
      ]);
      assert.equal(
        closureSuspensionResults.filter(
          (result) => result.status === "fulfilled",
        ).length,
        1,
        "Exactly one conflicting closure or suspension should commit.",
      );
      assert.equal(
        closureSuspensionResults.filter(
          (result) => result.status === "rejected",
        ).length,
        1,
      );
      const rejectedGovernanceAction = closureSuspensionResults.find(
        (result) => result.status === "rejected",
      );
      assert.ok(
        rejectedGovernanceAction &&
          rejectedGovernanceAction.status === "rejected",
      );
      assert.ok(
        rejectedGovernanceAction.reason instanceof FellowshipGovernanceError,
      );
      assert.ok(
        ["NOT_LEADER", "FELLOWSHIP_CLOSED"].includes(
          rejectedGovernanceAction.reason.code,
        ),
        "The losing action should receive the expected state conflict.",
      );

      const [scheduledClosures, activeSuspensions, conflictCases] =
        await Promise.all([
          prisma.fellowshipDissolution.count({
            where: { fellowshipId: fellowshipIds[1], status: "SCHEDULED" },
          }),
          prisma.fellowshipSuspension.count({
            where: { fellowshipId: fellowshipIds[1], status: "ACTIVE" },
          }),
          prisma.fellowshipGovernanceCase.count({
            where: { fellowshipId: fellowshipIds[1] },
          }),
        ]);
      assert.equal(scheduledClosures + activeSuspensions, 1);
      assert.equal(conflictCases, 1);

      // Establish a separate active suspension, then race two appeals. The
      // Fellowship lock and unique suspensionId must preserve one appeal event.
      const suspension = await fellowshipGovernanceRepository.suspendFellowship({
        adminId: suspendingAdminId,
        fellowshipId: fellowshipIds[2],
        confirmationName: fellowshipNames[2],
        reason: "Appeal concurrency integration test.",
      });
      const appealResults = await Promise.allSettled([
        fellowshipGovernanceRepository.submitSuspensionAppeal(
          leaderId,
          suspension.suspensionId,
          "Please review this first appeal request.",
        ),
        fellowshipGovernanceRepository.submitSuspensionAppeal(
          leaderId,
          suspension.suspensionId,
          "Please review this concurrent appeal request.",
        ),
      ]);
      assert.equal(
        appealResults.filter((result) => result.status === "fulfilled").length,
        1,
        "Only one concurrent appeal should be accepted.",
      );
      const rejectedAppeal = appealResults.find(
        (result) => result.status === "rejected",
      );
      assert.ok(rejectedAppeal && rejectedAppeal.status === "rejected");
      assert.ok(rejectedAppeal.reason instanceof FellowshipGovernanceError);
      assert.equal(rejectedAppeal.reason.code, "APPEAL_ALREADY_SUBMITTED");

      const caseRows = await prisma.fellowshipGovernanceCase.findMany({
        where: { fellowshipId: { in: fellowshipIds } },
        select: { fellowshipId: true, caseNumber: true, kind: true },
      });
      assert.equal(caseRows.length, 3);
      assert.equal(
        new Set(caseRows.map(({ caseNumber }) => caseNumber)).size,
        caseRows.length,
        "Concurrent case creation must not reuse a case number.",
      );
      for (const caseRow of caseRows) {
        assert.match(caseRow.caseNumber, /^FEL-\d{6}$/);
      }
      assert.equal(
        caseRows.find(({ fellowshipId }) => fellowshipId === fellowshipIds[0])
          ?.kind,
        "TRANSFER",
      );
      const conflictingCase = caseRows.find(
        ({ fellowshipId }) => fellowshipId === fellowshipIds[1],
      );
      assert.ok(conflictingCase);
      assert.ok(["CLOSURE", "SUSPENSION"].includes(conflictingCase.kind));
      assert.equal(
        caseRows.find(({ fellowshipId }) => fellowshipId === fellowshipIds[2])
          ?.kind,
        "SUSPENSION",
      );
    } finally {
      // Delete only rows attached to these generated Fellowship/user IDs.
      // Audit entries and appeals reference governance rows restrictively, so
      // cleanup follows dependency order inside one transaction.
      try {
        const governanceCases = await prisma.fellowshipGovernanceCase.findMany({
          where: { fellowshipId: { in: fellowshipIds } },
          select: { id: true },
        });
        const caseIds = governanceCases.map(({ id }) => id);
        const suspensions = await prisma.fellowshipSuspension.findMany({
          where: { fellowshipId: { in: fellowshipIds } },
          select: { id: true },
        });
        const suspensionIds = suspensions.map(({ id }) => id);

        await prisma.$transaction(async (transaction) => {
          await transaction.userNotification.deleteMany({
            where: { userId: { in: userIds } },
          });
          if (caseIds.length > 0) {
            await transaction.auditLog.deleteMany({
              where: { governanceCaseId: { in: caseIds } },
            });
          }
          if (suspensionIds.length > 0) {
            await transaction.fellowshipSuspensionAppeal.deleteMany({
              where: { suspensionId: { in: suspensionIds } },
            });
          }
          await transaction.fellowshipLeadershipTransfer.deleteMany({
            where: { fellowshipId: { in: fellowshipIds } },
          });
          await transaction.fellowshipDissolution.deleteMany({
            where: { fellowshipId: { in: fellowshipIds } },
          });
          await transaction.fellowshipSuspension.deleteMany({
            where: { fellowshipId: { in: fellowshipIds } },
          });
          if (caseIds.length > 0) {
            await transaction.fellowshipGovernanceCase.deleteMany({
              where: { id: { in: caseIds } },
            });
          }
          await transaction.fellowship.deleteMany({
            where: { id: { in: fellowshipIds } },
          });
          await transaction.user.deleteMany({ where: { id: { in: userIds } } });
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  },
);
