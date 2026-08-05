import type { BeaconLeague } from "@/lib/generated/prisma/enums";
import type {
  AvatarFrameKey,
  AvatarKey,
} from "@/features/profile/data/avatar-catalog";

export type LeaderboardScope =
  | "league"
  | "country"
  | "fellowship"
  | "all-time";

/** Public-safe ranking row; identity keys and emails never leave repositories. */
export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  avatarKey: AvatarKey;
  avatarFrameKey: AvatarFrameKey;
  countryCode: string | null;
  weeklyXp: number;
  waypointsCompletedThisWeek: number;
  beaconXp: number;
  beaconLevel: number;
  crowns: number;
  league: BeaconLeague;
  isCurrentUser: boolean;
};

export type LeaderboardFellowshipOption = {
  id: string;
  name: string;
};

export type LeaderboardRanking = {
  podium: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  page: number;
  totalPages: number;
  totalPlayers: number;
};

export type LeaderboardPageData = LeaderboardRanking & {
  needsEnrollment: boolean;
  scope: LeaderboardScope;
  countryCode: string | null;
  fellowships: LeaderboardFellowshipOption[];
  activeFellowshipId: string | null;
  activeFellowshipName: string | null;
  league: BeaconLeague;
  weekStartsAt: string;
  weekEndsAt: string;
  promotionCount: number;
  demotionCount: number;
};

export type UserScopeRanks = {
  global: number | null;
  country: number | null;
  fellowships: Array<{
    fellowshipId: string;
    fellowshipName: string;
    rank: number | null;
  }>;
};
