import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CreateFellowshipInput, UpdateFellowshipInput } from "@/features/fellowships/schemas/fellowship.schema";
import type { FellowshipConflictCode, FellowshipDetailData, FellowshipDirectoryData, FellowshipEditData, FellowshipInvitePreview } from "@/features/fellowships/types/fellowship.types";

const transactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;

export class FellowshipConflictError extends Error {
  constructor(readonly code: FellowshipConflictCode) {
    super(code);
    this.name = "FellowshipConflictError";
  }
}

/** Produces a human-readable base while uniqueness remains database-enforced. */
function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "fellowship";
}

/** Owns all Fellowship reads and locked membership mutations. */
export const fellowshipRepository = {
  /** Resolves only the minimal, non-sensitive identity needed by a public invitation landing page. */
  async getInvitePreview(inviteCode: string, userId?: string): Promise<FellowshipInvitePreview | null> {
    const fellowship = await prisma.fellowship.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isPublic: true,
        insigniaKey: true,
        _count: { select: { members: true } },
        ...(userId ? { members: { where: { userId }, select: { id: true }, take: 1 } } : {}),
        ...(userId ? { joinRequests: { where: { userId }, select: { id: true, status: true }, take: 1 } } : {}),
      },
    });
    if (!fellowship) return null;
    return {
      slug: fellowship.slug,
      name: fellowship.name,
      description: fellowship.description,
      insigniaKey: fellowship.insigniaKey,
      memberCount: fellowship._count.members,
      isMember: "members" in fellowship && fellowship.members.length > 0,
      isPublic: fellowship.isPublic,
      requestStatus: "joinRequests" in fellowship ? (fellowship.joinRequests[0]?.status ?? null) : null,
      requestId: "joinRequests" in fellowship ? (fellowship.joinRequests[0]?.id ?? null) : null,
    };
  },

  async getDirectory(userId: string, search = ""): Promise<FellowshipDirectoryData> {
    const normalizedSearch = search.trim().slice(0, 50);
    const [memberships, discoverableFellowships] = await Promise.all([
      prisma.fellowship.findMany({
        where: { members: { some: { userId } } },
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true } } },
      }),
      prisma.fellowship.findMany({
        where: { members: { none: { userId } }, ...(normalizedSearch ? { name: { contains: normalizedSearch, mode: "insensitive" } } : {}) },
        orderBy: [{ members: { _count: "desc" } }, { name: "asc" }],
        take: 50,
        include: { _count: { select: { members: true } }, joinRequests: { where: { userId }, select: { id: true, status: true }, take: 1 } },
      }),
    ]);
    const memberMap = (item: (typeof memberships)[number]) => ({ id: item.id, slug: item.slug, name: item.name, description: item.description, isPublic: item.isPublic, memberCount: item._count.members, isMember: true, isLeader: item.createdById === userId, insigniaKey: item.insigniaKey, requestStatus: null, requestId: null });
    const discoveryMap = (item: (typeof discoverableFellowships)[number]) => ({ id: item.id, slug: item.slug, name: item.name, description: item.description, isPublic: item.isPublic, memberCount: item._count.members, isMember: false, isLeader: false, insigniaKey: item.insigniaKey, requestStatus: item.joinRequests[0]?.status ?? null, requestId: item.joinRequests[0]?.id ?? null });
    return { memberships: memberships.map(memberMap), discoverableFellowships: discoverableFellowships.map(discoveryMap) };
  },

  async getDetail(userId: string, slug: string): Promise<FellowshipDetailData | null> {
    const fellowship = await prisma.fellowship.findUnique({
      where: { slug },
      include: { members: { orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, profile: { select: { displayName: true, countryCode: true, totalWaypointsCompleted: true, totalGlowPoints: true } } } } } }, joinRequests: { orderBy: { requestedAt: "desc" }, take: 50, include: { user: { select: { profile: { select: { displayName: true, countryCode: true, totalWaypointsCompleted: true, totalGlowPoints: true } } } } } }, _count: { select: { members: true } } },
    });
    if (!fellowship) return null;
    const isMember = fellowship.members.some((member) => member.userId === userId);
    if (!fellowship.isPublic && !isMember) return null;
    const ranked = [...fellowship.members].sort((left, right) => (right.user.profile?.totalWaypointsCompleted ?? 0) - (left.user.profile?.totalWaypointsCompleted ?? 0) || (right.user.profile?.totalGlowPoints ?? 0) - (left.user.profile?.totalGlowPoints ?? 0) || left.joinedAt.getTime() - right.joinedAt.getTime());
    return {
      id: fellowship.id, slug: fellowship.slug, name: fellowship.name, description: fellowship.description, isPublic: fellowship.isPublic, memberCount: fellowship._count.members, isMember, isLeader: fellowship.createdById === userId, insigniaKey: fellowship.insigniaKey, inviteCode: fellowship.createdById === userId ? fellowship.inviteCode : null, requestStatus: null, requestId: null,
      members: ranked.map((member, index) => ({ rank: index + 1, displayName: member.user.profile?.displayName ?? "Player", countryCode: member.user.profile?.countryCode ?? null, waypointsCompleted: member.user.profile?.totalWaypointsCompleted ?? 0, glowPoints: member.user.profile?.totalGlowPoints ?? 0, joinedAt: member.joinedAt, isLeader: member.userId === fellowship.createdById })),
      joinRequests: fellowship.createdById === userId ? fellowship.joinRequests.map((request) => ({ id: request.id, displayName: request.user.profile?.displayName ?? "Player", countryCode: request.user.profile?.countryCode ?? null, waypointsCompleted: request.user.profile?.totalWaypointsCompleted ?? 0, glowPoints: request.user.profile?.totalGlowPoints ?? 0, source: request.source, status: request.status, requestedAt: request.requestedAt, resolvedAt: request.resolvedAt })) : [],
    };
  },

  async create(userId: string, input: CreateFellowshipInput): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-create'), hashtext(${userId}))`;
      const recent = await transaction.fellowship.count({ where: { createdById: userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
      if (recent >= 3) throw new FellowshipConflictError("CREATION_LIMIT");
      const baseSlug = slugify(input.name);
      const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;
      try {
        const created = await transaction.fellowship.create({ data: { ...input, description: input.description || null, slug, inviteCode: randomBytes(16).toString("base64url"), createdById: userId, members: { create: { userId } } }, select: { slug: true } });
        return created;
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") throw new FellowshipConflictError("NAME_TAKEN");
        throw error;
      }
    }, transactionOptions);
  },

  /** Returns settings only when the requesting learner owns the fellowship. */
  async getEditable(userId: string, slug: string): Promise<FellowshipEditData | null> {
    return prisma.fellowship.findFirst({
      where: { slug, createdById: userId },
      select: { id: true, slug: true, name: true, description: true, isPublic: true, insigniaKey: true, inviteCode: true },
    });
  },

  /** Updates identity under a leader-scoped lock and never accepts upload URLs. */
  async update(userId: string, input: UpdateFellowshipInput): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-update'), hashtext(${input.fellowshipId}))`;
      const fellowship = await transaction.fellowship.findFirst({
        where: { id: input.fellowshipId, createdById: userId },
        select: { slug: true },
      });
      if (!fellowship) throw new FellowshipConflictError("NOT_LEADER");
      await transaction.fellowship.update({
        where: { id: input.fellowshipId },
        data: {
          name: input.name,
          description: input.description || null,
          isPublic: input.isPublic,
          insigniaKey: input.insigniaKey,
        },
      });
      return fellowship;
    }, transactionOptions);
  },

  async joinPublic(userId: string, fellowshipId: string): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-member'), hashtext(${userId}))`;
      const fellowship = await transaction.fellowship.findFirst({ where: { id: fellowshipId, isPublic: true }, select: { id: true, slug: true } });
      if (!fellowship) throw new FellowshipConflictError("NOT_FOUND");
      const exists = await transaction.fellowshipMember.findUnique({ where: { fellowshipId_userId: { fellowshipId, userId } }, select: { id: true } });
      if (exists) throw new FellowshipConflictError("ALREADY_MEMBER");
      await transaction.fellowshipMember.create({ data: { fellowshipId, userId } });
      await transaction.fellowshipJoinRequest.updateMany({ where: { fellowshipId, userId }, data: { status: "APPROVED", resolvedAt: new Date(), reviewedById: null } });
      return { slug: fellowship.slug };
    }, transactionOptions);
  },

  /** Rotates the secret under a Fellowship-scoped lock so concurrent requests cannot restore a stale code. */
  async regenerateInvite(userId: string, fellowshipId: string): Promise<{ slug: string; inviteCode: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-invite'), hashtext(${fellowshipId}))`;
      const fellowship = await transaction.fellowship.findFirst({
        where: { id: fellowshipId, createdById: userId },
        select: { slug: true },
      });
      if (!fellowship) throw new FellowshipConflictError("NOT_LEADER");
      const inviteCode = randomBytes(16).toString("base64url");
      await transaction.fellowship.update({ where: { id: fellowshipId }, data: { inviteCode } });
      return { slug: fellowship.slug, inviteCode };
    }, transactionOptions);
  },

  async joinByInvite(userId: string, inviteCode: string): Promise<{ slug: string; joined: boolean }> {
    const fellowship = await prisma.fellowship.findUnique({ where: { inviteCode }, select: { id: true, slug: true, isPublic: true } });
    if (!fellowship) throw new FellowshipConflictError("NOT_FOUND");
    if (fellowship.isPublic) return { ...(await this.joinById(userId, fellowship.id)), joined: true };
    return { ...(await this.requestJoin(userId, fellowship.id, "INVITE")), joined: false };
  },

  /** Creates or renews one learner-owned request for a private fellowship. */
  async requestJoin(userId: string, fellowshipId: string, source: "DIRECTORY" | "INVITE"): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-request'), hashtext(${`${fellowshipId}:${userId}`}))`;
      const fellowship = await transaction.fellowship.findFirst({ where: { id: fellowshipId, isPublic: false }, select: { slug: true } });
      if (!fellowship) throw new FellowshipConflictError("NOT_FOUND");
      const membership = await transaction.fellowshipMember.findUnique({ where: { fellowshipId_userId: { fellowshipId, userId } }, select: { id: true } });
      if (membership) throw new FellowshipConflictError("ALREADY_MEMBER");
      const existing = await transaction.fellowshipJoinRequest.findUnique({ where: { fellowshipId_userId: { fellowshipId, userId } }, select: { status: true } });
      if (existing?.status === "PENDING") throw new FellowshipConflictError("REQUEST_PENDING");
      await transaction.fellowshipJoinRequest.upsert({
        where: { fellowshipId_userId: { fellowshipId, userId } },
        create: { fellowshipId, userId, source },
        update: { source, status: "PENDING", requestedAt: new Date(), resolvedAt: null, reviewedById: null },
      });
      return fellowship;
    }, transactionOptions);
  },

  /** Cancels only the authenticated learner's own pending request. */
  async cancelJoinRequest(userId: string, requestId: string): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      const request = await transaction.fellowshipJoinRequest.findFirst({ where: { id: requestId, userId, status: "PENDING" }, select: { id: true, fellowship: { select: { slug: true } } } });
      if (!request) throw new FellowshipConflictError("REQUEST_NOT_FOUND");
      await transaction.fellowshipJoinRequest.update({ where: { id: request.id }, data: { status: "CANCELLED", resolvedAt: new Date(), reviewedById: null } });
      return request.fellowship;
    }, transactionOptions);
  },

  /** Lets only the fellowship leader resolve a pending request. */
  async resolveJoinRequest(leaderId: string, requestId: string, decision: "APPROVE" | "REJECT"): Promise<{ slug: string; applicantUserId: string; joined: boolean }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-request-resolve'), hashtext(${requestId}))`;
      const request = await transaction.fellowshipJoinRequest.findFirst({ where: { id: requestId, status: "PENDING", fellowship: { createdById: leaderId } }, select: { id: true, userId: true, fellowshipId: true, fellowship: { select: { slug: true } } } });
      if (!request) throw new FellowshipConflictError("REQUEST_NOT_PENDING");
      const approved = decision === "APPROVE";
      if (approved) await transaction.fellowshipMember.create({ data: { fellowshipId: request.fellowshipId, userId: request.userId } });
      await transaction.fellowshipJoinRequest.update({ where: { id: request.id }, data: { status: approved ? "APPROVED" : "REJECTED", resolvedAt: new Date(), reviewedById: leaderId } });
      return { slug: request.fellowship.slug, applicantUserId: request.userId, joined: approved };
    }, transactionOptions);
  },

  async joinById(userId: string, fellowshipId: string): Promise<{ slug: string }> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-member'), hashtext(${userId}))`;
      const fellowship = await transaction.fellowship.findUnique({ where: { id: fellowshipId }, select: { slug: true } });
      if (!fellowship) throw new FellowshipConflictError("NOT_FOUND");
      const exists = await transaction.fellowshipMember.findUnique({ where: { fellowshipId_userId: { fellowshipId, userId } }, select: { id: true } });
      if (exists) throw new FellowshipConflictError("ALREADY_MEMBER");
      await transaction.fellowshipMember.create({ data: { fellowshipId, userId } });
      await transaction.fellowshipJoinRequest.updateMany({ where: { fellowshipId, userId }, data: { status: "APPROVED", resolvedAt: new Date(), reviewedById: null } });
      return fellowship;
    }, transactionOptions);
  },

  async leave(userId: string, fellowshipId: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-fellowship-member'), hashtext(${userId}))`;
      const fellowship = await transaction.fellowship.findUnique({ where: { id: fellowshipId }, select: { createdById: true } });
      if (!fellowship) throw new FellowshipConflictError("NOT_FOUND");
      if (fellowship.createdById === userId) throw new FellowshipConflictError("LEADER_CANNOT_LEAVE");
      const removed = await transaction.fellowshipMember.deleteMany({ where: { fellowshipId, userId } });
      if (removed.count !== 1) throw new FellowshipConflictError("NOT_MEMBER");
    }, transactionOptions);
  },
} as const;
