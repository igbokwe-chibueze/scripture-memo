import type { FriendState, PlayerSummary } from "@/types/player-social.types";

/** Deliberate allowlist: email, currency, private notes and other friends are absent. */
export type PlayerProfileData = PlayerSummary & {
  relationship: FriendState;
  countryCode: string | null;
  joinedAt: string;
  beaconLevel: number;
  lifetimeBeaconXp: number;
  completedWaypoints: number;
  currentStreak: number;
  bestStreak: number;
  masteredVerses: number;
  privateDetails: {
    friends: number;
    fellowships: number;
    hintsUsed: number;
    availableAvatars: string[];
  } | null;
  nextUsernameChangeAt: string | null;
  badges: { id: string; name: string; icon: string | null; rarity: string }[];
  hasMoreBadges: boolean;
};
