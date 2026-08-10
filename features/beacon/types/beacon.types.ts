import type { BeaconLeague } from "@/lib/generated/prisma/enums";

export type BeaconProgressionResult = {
  earnedXp: number;
  lifetimeXp: number;
  previousLevel: number;
  level: number;
  leveledUp: boolean;
  currentLevelStartXp: number;
  nextLevelXp: number;
  weeklyXp: number;
  league: BeaconLeague;
};
