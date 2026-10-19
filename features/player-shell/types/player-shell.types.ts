/** Compact global progression values displayed in the protected top bar. */
export type PlayerShellSummary = {
  glowPoints: number;
  streakDays: number;
  beaconPoints: number;
  /** Bundled portrait key, selected in the same read as the counters. */
  avatarKey?: string;
  /** Saved cosmetic selection, loaded with the portrait without extra reads. */
  avatarFrameKey?: string;
  displayName?: string;
};
