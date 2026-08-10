import { BeaconLeague } from "@/lib/generated/prisma/enums";

export type LeagueCatalogEntry = {
  league: BeaconLeague;
  imagePath: string;
  sequence: number;
  accentClass: string;
};

/**
 * Single source of truth for league ordering and presentation assets.
 *
 * Names remain localized UI text rather than baked into raster art, allowing
 * new interface languages without regenerating the nine independent emblems.
 */
export const LEAGUE_CATALOG: readonly LeagueCatalogEntry[] = [
  {
    league: BeaconLeague.TRAVELER,
    imagePath: "/images/leagues/traveler.png",
    sequence: 1,
    accentClass: "from-sky-500/25 to-blue-950/10",
  },
  {
    league: BeaconLeague.DISCIPLE,
    imagePath: "/images/leagues/disciple.png",
    sequence: 2,
    accentClass: "from-emerald-500/25 to-green-950/10",
  },
  {
    league: BeaconLeague.MESSENGER,
    imagePath: "/images/leagues/messenger.png",
    sequence: 3,
    accentClass: "from-fuchsia-500/25 to-violet-950/10",
  },
  {
    league: BeaconLeague.WATCHMAN,
    imagePath: "/images/leagues/watchman.png",
    sequence: 4,
    accentClass: "from-blue-500/25 to-slate-950/10",
  },
  {
    league: BeaconLeague.TEACHER,
    imagePath: "/images/leagues/teacher.png",
    sequence: 5,
    accentClass: "from-green-500/25 to-emerald-950/10",
  },
  {
    league: BeaconLeague.SHEPHERD,
    imagePath: "/images/leagues/shepherd.png",
    sequence: 6,
    accentClass: "from-rose-500/25 to-red-950/10",
  },
  {
    league: BeaconLeague.ELDER,
    imagePath: "/images/leagues/elder.png",
    sequence: 7,
    accentClass: "from-purple-500/25 to-violet-950/10",
  },
  {
    league: BeaconLeague.SCRIBE,
    imagePath: "/images/leagues/scribe.png",
    sequence: 8,
    accentClass: "from-blue-500/25 to-indigo-950/10",
  },
  {
    league: BeaconLeague.SAINT,
    imagePath: "/images/leagues/saint.png",
    sequence: 9,
    accentClass: "from-violet-500/30 to-amber-500/10",
  },
] as const;

/** Resolves a persisted league to its visual metadata. */
export function getLeagueCatalogEntry(league: BeaconLeague): LeagueCatalogEntry {
  return LEAGUE_CATALOG.find((entry) => entry.league === league) ?? LEAGUE_CATALOG[0];
}
