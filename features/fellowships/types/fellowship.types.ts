export type FellowshipSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
  isMember: boolean;
  isLeader: boolean;
  isClosing: boolean;
  closureCancelDeadline: Date | null;
  isSuspended: boolean;
  insigniaKey: string;
  requestStatus: FellowshipJoinRequestStatus | null;
  requestId: string | null;
};

export type FellowshipJoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type FellowshipJoinRequestItem = {
  id: string;
  displayName: string;
  countryCode: string | null;
  waypointsCompleted: number;
  glowPoints: number;
  source: "DIRECTORY" | "INVITE";
  status: FellowshipJoinRequestStatus;
  requestedAt: Date;
  resolvedAt: Date | null;
};

export type FellowshipMemberRanking = {
  rank: number;
  displayName: string;
  countryCode: string | null;
  waypointsCompleted: number;
  glowPoints: number;
  joinedAt: Date;
  isLeader: boolean;
};

export type FellowshipDirectoryData = {
  memberships: FellowshipSummary[];
  discoverableFellowships: FellowshipSummary[];
};

export type FellowshipDetailData = FellowshipSummary & {
  inviteCode: string | null;
  members: FellowshipMemberRanking[];
  joinRequests: FellowshipJoinRequestItem[];
  governance: FellowshipGovernanceData;
};

export type FellowshipGovernanceData = {
  isClosing: boolean;
  dissolutionId: string | null;
  cancellationDeadline: Date | null;
  pendingTransfer: {
    id: string;
    targetDisplayName: string;
    isRecipient: boolean;
  } | null;
  transferCandidates: Array<{ membershipId: string; displayName: string }>;
  suspension: FellowshipSuspensionData | null;
};

export type FellowshipSuspensionData = {
  id: string;
  reason: string;
  suspendedAt: Date;
  appealDeadline: Date;
  appeal: {
    id: string;
    statement: string;
    status: "PENDING" | "RESTORED" | "UPHELD";
    submittedAt: Date;
    reviewedAt: Date | null;
    decisionReason: string | null;
  } | null;
};

export type FellowshipModerationItem = {
  id: string;
  slug: string;
  name: string;
  isPublic: boolean;
  leaderDisplayName: string;
  memberCount: number;
  transferCandidates: Array<{ membershipId: string; displayName: string }>;
  closure: {
    reason: string;
    status: "SCHEDULED" | "CANCELLED" | "FORCED";
    createdAt: Date;
    cancellationDeadline: Date | null;
  } | null;
  suspension: {
    id: string;
    reason: string;
    status: "ACTIVE" | "RESTORED";
    createdAt: Date;
    appealDeadline: Date;
    suspendedById: string;
    suspendedByDisplayName: string;
    appeal: {
      id: string;
      appellantDisplayName: string;
      appellantId: string;
      statement: string;
      status: "PENDING" | "RESTORED" | "UPHELD";
      submittedAt: Date;
      decisionReason: string | null;
      reviewedAt: Date | null;
      reviewerId: string | null;
    } | null;
  } | null;
  governanceHistory: FellowshipGovernanceHistoryEvent[];
  totalGovernanceLogCount: number;
};

export type FellowshipGovernanceHistoryEvent =
  | {
      kind: "LEADERSHIP_TRANSFER";
      status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
      caseStatus: string;
      createdAt: Date;
      actorDisplayName: string;
      targetDisplayName: string;
      reason: null;
      caseNumber: string;
    }
  | {
      kind: "CLOSURE";
      status: "SCHEDULED" | "CANCELLED" | "FORCED";
      caseStatus: string;
      createdAt: Date;
      actorDisplayName: string;
      targetDisplayName: null;
      reason: string;
      caseNumber: string;
    }
  | {
      kind: "SUSPENSION";
      status: "ACTIVE" | "RESTORED";
      caseStatus: string;
      createdAt: Date;
      actorDisplayName: string;
      targetDisplayName: null;
      reason: string;
      caseNumber: string;
    }
  | {
      kind: "APPEAL";
      status: "PENDING" | "RESTORED" | "UPHELD";
      caseStatus: string;
      createdAt: Date;
      actorDisplayName: string;
      targetDisplayName: null;
      reason: string | null;
      caseNumber: string;
    };

export type FellowshipModerationStatus =
  | "ALL"
  | "ACTIVE"
  | "SUSPENDED"
  | "APPEAL_PENDING"
  | "CLOSING"
  | "CLOSED";

export type FellowshipModerationListItem = {
  id: string;
  slug: string;
  name: string;
  isPublic: boolean;
  memberCount: number;
  leaderDisplayName: string;
  updatedAt: Date;
  status: Exclude<FellowshipModerationStatus, "ALL">;
};

export type FellowshipModerationPage = {
  items: FellowshipModerationListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type FellowshipEditData = Pick<
  FellowshipSummary,
  "id" | "slug" | "name" | "description" | "isPublic" | "insigniaKey"
> & {
  inviteCode: string;
  governance: FellowshipGovernanceData;
};

export type FellowshipInvitePreview = Pick<
  FellowshipSummary,
  "slug" | "name" | "description" | "memberCount" | "insigniaKey"
> & { isMember: boolean; isPublic: boolean; requestStatus: FellowshipJoinRequestStatus | null; requestId: string | null };

export type FellowshipMutationData = {
  slug: string;
  outcome?: "JOINED" | "REQUESTED";
  badgeUnlocks: import("@/features/badges/types/badge.types").BadgeUnlockResult[];
};

export type FellowshipConflictCode =
  | "NAME_TAKEN"
  | "NOT_FOUND"
  | "ALREADY_MEMBER"
  | "NOT_MEMBER"
  | "LEADER_CANNOT_LEAVE"
  | "CREATION_LIMIT"
  | "NOT_LEADER"
  | "REQUEST_PENDING"
  | "REQUEST_NOT_FOUND"
  | "REQUEST_NOT_PENDING"
  | "TRANSFER_PENDING"
  | "TRANSFER_NOT_FOUND"
  | "TRANSFER_NOT_RECIPIENT"
  | "MEMBER_NOT_FOUND"
  | "DISSOLUTION_PENDING"
  | "DISSOLUTION_NOT_CANCELABLE"
  | "NAME_CONFIRMATION_MISMATCH"
  | "FELLOWSHIP_CLOSED"
  | "FELLOWSHIP_SUSPENDED"
  | "SUSPENSION_NOT_FOUND"
  | "APPEAL_WINDOW_CLOSED"
  | "APPEAL_ALREADY_SUBMITTED"
  | "APPEAL_NOT_PENDING"
  | "APPEAL_REVIEWER_CONFLICT";
