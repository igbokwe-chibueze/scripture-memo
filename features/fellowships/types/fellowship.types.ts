export type FellowshipSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
  isMember: boolean;
  isLeader: boolean;
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
};

export type FellowshipEditData = Pick<
  FellowshipSummary,
  "id" | "slug" | "name" | "description" | "isPublic" | "insigniaKey"
>;

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
  | "REQUEST_NOT_PENDING";
