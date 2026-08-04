/** Ranking scopes supported by the Great Beacon screen. */
export type LeaderboardScope = "global" | "country" | "fellowship";

/**
 * Public-safe ranking row. Identity keys and email addresses deliberately never
 * cross the repository boundary.
 */
export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  countryCode: string | null;
  waypointsCompleted: number;
  glowPoints: number;
  currentStreak: number;
  isCurrentUser: boolean;
};

/** Minimal fellowship identity used only to build authorized scope tabs. */
export type LeaderboardFellowshipOption = {
  id: string;
  name: string;
};

/** One paginated ranking result with the signed-in learner pinned separately. */
export type LeaderboardRanking = {
  podium: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  page: number;
  totalPages: number;
  totalPlayers: number;
};

/** Complete server-owned data required to render one leaderboard scope. */
export type LeaderboardPageData = LeaderboardRanking & {
  scope: LeaderboardScope;
  countryCode: string | null;
  fellowships: LeaderboardFellowshipOption[];
  activeFellowshipId: string | null;
  activeFellowshipName: string | null;
};

/** Rank summary required by later contextual game surfaces. */
export type UserScopeRanks = {
  global: number | null;
  country: number | null;
  fellowships: Array<{
    fellowshipId: string;
    fellowshipName: string;
    rank: number | null;
  }>;
};
