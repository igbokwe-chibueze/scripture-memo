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
  publicFellowships: FellowshipSummary[];
};

export type FellowshipDetailData = FellowshipSummary & {
  inviteCode: string | null;
  members: FellowshipMemberRanking[];
};

export type FellowshipEditData = Pick<
  FellowshipSummary,
  "id" | "slug" | "name" | "description" | "isPublic" | "insigniaKey"
>;

export type FellowshipMutationData = {
  slug: string;
  badgeUnlocks: import("@/features/badges/types/badge.types").BadgeUnlockResult[];
};

export type FellowshipConflictCode =
  | "NAME_TAKEN"
  | "NOT_FOUND"
  | "ALREADY_MEMBER"
  | "NOT_MEMBER"
  | "LEADER_CANNOT_LEAVE"
  | "CREATION_LIMIT"
  | "NOT_LEADER";
