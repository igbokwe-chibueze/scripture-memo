/** Browser-safe relationship state never discloses who blocked the viewer. */
export type FriendState =
  "self" | "none" | "incoming" | "outgoing" | "friends" | "blocked";

/** Minimal identity shared by search, requests and the owner's private friend list. */
export type PlayerSummary = {
  publicId: string;
  displayName: string;
  username: string | null;
  avatarKey: string;
  avatarFrameKey: string;
};

/** Public progress enriches the private list without exposing balances or account IDs. */
export type FriendListPlayer = PlayerSummary & {
  relationship: FriendState;
  countryCode: string | null;
  completedWaypoints: number | null;
  lifetimeBeaconXp: number | null;
};

/** Totals are independent of page/search; list pagination still uses one lookahead row. */
export type FriendsPageData = {
  players: FriendListPlayer[];
  hasNext: boolean;
  ownPublicId: string;
  counts: { friends: number; requests: number; sent: number; blocked: number };
};
