/** Browser-safe relationship state never discloses who blocked the viewer. */
export type FriendState =
  | "self"
  | "none"
  | "incoming"
  | "outgoing"
  | "friends"
  | "blocked";

/** Minimal identity shared by search, requests and the owner's private friend list. */
export type PlayerSummary = {
  publicId: string;
  displayName: string;
  username: string | null;
  avatarKey: string;
  avatarFrameKey: string;
};

/** Pagination fetches one extra row instead of a separate count query. */
export type FriendsPageData = {
  players: (PlayerSummary & { relationship: FriendState })[];
  hasNext: boolean;
  ownPublicId: string;
};
