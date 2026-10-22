import Image from "next/image";
import { cn } from "@/lib/utils";

/** Stable, bundled artwork keys; callers cannot inject arbitrary image URLs. */
export const GAME_ARTWORK = {
  home: "home",
  map: "map",
  vault: "vault",
  leaderboard: "leaderboard",
  shop: "shop",
  settings: "settings",
  fellowship: "fellowship",
  friends: "friends",
  trivia: "trivia",
  badges: "badges",
  bibleClosed: "bible-closed",
  bibleOpen: "bible-open",
  dailyChallenge: "daily-challenge",
  flameLit: "flame-lit",
  flameUnlit: "flame-unlit",
  beacon: "beacon",
  bellLight: "bell-light",
  bellDark: "bell-dark",
  diamond: "diamond",
  admin: "admin",
} as const;

/** Renders supplied decorative icons beside visible, accessible labels. */
export function GameArtwork({
  name,
  className,
  sizes = "64px",
}: Readonly<{
  name: keyof typeof GAME_ARTWORK;
  className?: string;
  sizes?: string;
}>): React.ReactNode {
  return (
    <Image
      src={`/images/game-ui/${GAME_ARTWORK[name]}.png`}
      alt=""
      width={1254}
      height={1254}
      sizes={sizes}
      draggable={false}
      className={cn("size-12 shrink-0 object-contain select-none", className)}
    />
  );
}

/**
 * Uses the owner's supplied golden diamond in every Home and top-bar reward.
 * Keeping this wrapper preserves consistent sizing at both existing call sites.
 */
export function GlowGem({
  className,
}: Readonly<{ className?: string }>): React.ReactNode {
  return (
    <GameArtwork
      name="diamond"
      sizes="40px"
      className={cn("size-8 shrink-0", className)}
    />
  );
}
