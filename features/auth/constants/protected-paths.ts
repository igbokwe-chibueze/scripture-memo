/** Route prefixes that require a valid authenticated session. */
export const PROTECTED_PATH_PREFIXES = [
  "/game",
  "/bible",
  "/partner",
  "/map",
  "/waypoints",
  "/vault",
  "/sanctuary",
  "/oil-shop",
  "/fellowships",
  "/leaderboard",
  "/settings",
  "/select-translation",
  "/admin",
] as const;
