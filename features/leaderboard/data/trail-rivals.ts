import { BeaconLeague } from "@/lib/generated/prisma/enums";
import {
  AVATAR_KEYS,
  type AvatarKey,
} from "@/features/profile/data/avatar-catalog";
import type { LeaderboardEntry } from "@/features/leaderboard/types/leaderboard.types";

const TARGET_VISIBLE_ROWS = 15;
const RIVAL_NAMES = [
  "Amara", "Mateo", "Noah", "Sofia", "Elijah", "Maya", "Daniel", "Amina",
  "Lucas", "Chloe", "Samuel", "Zara", "Micah", "Leah", "Ethan", "Naomi",
  "Jonah", "Ada", "Caleb", "Mila", "Isaac", "Nia", "Ezra", "Grace",
] as const;
const COUNTRY_CODES = [
  "NG", "GH", "KE", "ZA", "US", "CA", "GB", "FR", "ES", "BR", "MX", "IN",
] as const;
const LEAGUE_ORDER = Object.values(BeaconLeague);

/** Produces a stable unsigned seed without introducing a runtime dependency. */
function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/** Returns a repeatable pseudo-random fraction for one named simulation event. */
function seededFraction(seed: string): number {
  return hash(seed) / 4_294_967_295;
}

/**
 * Builds cumulative weekly activity from discrete daily play sessions.
 *
 * WHY: A rival may skip a whole day, play once, or return several times. Only
 * sessions whose scheduled hour has passed contribute points, so scores remain
 * stable between sessions and rise naturally later without database records.
 */
export function calculateRivalWeeklyXp(input: {
  seed: string;
  weekStartsAt: Date;
  now: Date;
  league: BeaconLeague;
}): number {
  const elapsedMs = Math.max(0, input.now.getTime() - input.weekStartsAt.getTime());
  const elapsedDays = Math.min(6, Math.floor(elapsedMs / 86_400_000));
  const currentHour = input.now.getUTCHours();
  const leagueIndex = Math.max(0, LEAGUE_ORDER.indexOf(input.league));
  const baseSessionPoints = 45 + (leagueIndex * 18);
  let total = 0;

  for (let day = 0; day <= elapsedDays; day += 1) {
    const daySeed = `${input.seed}:day:${day}`;
    const playsToday = seededFraction(`${daySeed}:active`) > 0.34;
    if (!playsToday) continue;

    const sessionCount = 1 + Math.floor(seededFraction(`${daySeed}:count`) * 3);
    for (let session = 0; session < sessionCount; session += 1) {
      const scheduledHour = 7 + Math.floor(
        seededFraction(`${daySeed}:hour:${session}`) * 15,
      );
      const sessionHasOccurred = day < elapsedDays || scheduledHour <= currentHour;
      if (!sessionHasOccurred) continue;

      const variation = 0.65 + seededFraction(`${daySeed}:points:${session}`);
      total += Math.round(baseSessionPoints * variation);
    }
  }

  return total;
}

/** Creates viewer-specific display rivals that never enter official standings. */
export function createTrailRivals(input: {
  viewerId: string;
  scope: "league" | "country";
  countryCode: string | null;
  league: BeaconLeague;
  weekStartsAt: Date;
  now: Date;
  realVisibleCount: number;
}): LeaderboardEntry[] {
  const count = Math.max(0, TARGET_VISIBLE_ROWS - input.realVisibleCount);
  const viewerSeed = `${input.viewerId}:${input.weekStartsAt.toISOString()}:${input.scope}`;

  return Array.from({ length: count }, (_, index) => {
    const rivalSeed = `${viewerSeed}:rival:${index}`;
    const nameStart = Math.floor(
      seededFraction(`${viewerSeed}:name-start`) * RIVAL_NAMES.length,
    );
    // Five is coprime with the 24-name catalog, so the visible 15 rivals never
    // repeat a name while still differing between viewers and competition weeks.
    const nameIndex = (nameStart + (index * 5)) % RIVAL_NAMES.length;
    const avatarIndex = (
      Math.floor(seededFraction(`${viewerSeed}:avatar-start`) * AVATAR_KEYS.length) +
      index
    ) % AVATAR_KEYS.length;
    const countryIndex = (
      Math.floor(seededFraction(`${viewerSeed}:country-start`) * COUNTRY_CODES.length) +
      index
    ) % COUNTRY_CODES.length;

    return {
      kind: "RIVAL",
      rank: null,
      displayName: RIVAL_NAMES[nameIndex],
      avatarKey: AVATAR_KEYS[avatarIndex] as AvatarKey,
      avatarFrameKey: "default",
      countryCode:
        input.scope === "country"
          ? input.countryCode
          : COUNTRY_CODES[countryIndex],
      weeklyXp: calculateRivalWeeklyXp({
        seed: rivalSeed,
        weekStartsAt: input.weekStartsAt,
        now: input.now,
        league: input.league,
      }),
      waypointsCompletedThisWeek: 0,
      beaconXp: 0,
      beaconLevel: 1,
      crowns: 0,
      league: input.league,
      isCurrentUser: false,
      isOnline: false,
    };
  });
}
