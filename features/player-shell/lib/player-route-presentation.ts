/** Route identity is separate from destinations offered in the global menu.
 * Sanctuary is its own screen, so it must not claim Vault as the current page.
 * These pure rules require no session, reads, writes, or browser state.
 */
const PLAYER_SECTIONS = [
  { prefix: "/vault/badges", key: "badgeCollection", artwork: "badges" },
  { prefix: "/leaderboard", key: "leaderboard", artwork: "leaderboard" },
  { prefix: "/game/map", key: "map", artwork: "map" },
  { prefix: "/game/waypoints", key: "map", artwork: "map" },
  { prefix: "/vault", key: "vault", artwork: "vault" },
  { prefix: "/sanctuary", key: "sanctuary", artwork: "bibleOpen" },
  { prefix: "/fellowships", key: "fellowships", artwork: "fellowship" },
  { prefix: "/profiles", key: "memberProfile", artwork: "fellowship" },
  { prefix: "/stats", key: "stats", artwork: "beacon" },
  { prefix: "/friends", key: "friends", artwork: "fellowship" },
  { prefix: "/oil-shop", key: "shop", artwork: "shop" },
  { prefix: "/settings", key: "settings", artwork: "settings" },
  { prefix: "/bible", key: "bible", artwork: "bibleOpen" },
  { prefix: "/game/trivia", key: "trivia", artwork: "trivia" },
  { prefix: "/game/daily-challenge", key: "dailyChallenge", artwork: "dailyChallenge" },
  { prefix: "/partner", key: "partner", artwork: "home" },
] as const;

/** Matches a full route segment so similarly prefixed paths cannot inherit labels. */
export function getPlayerSection(
  pathname: string,
): (typeof PLAYER_SECTIONS)[number] | undefined {
  return PLAYER_SECTIONS.find(({ prefix }) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Shared desktop/mobile selection; waypoint details intentionally belong to Map. */
export function isPlayerNavigationActive(
  pathname: string,
  href: string,
  exact: boolean,
): boolean {
  if (exact) return pathname === href;
  return pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/game/map" && pathname.startsWith("/game/waypoints/"));
}
