import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  normalizeAvatarFrameKey,
  normalizeAvatarKey,
  type AvatarFrameKey,
  type AvatarKey,
} from "@/features/profile/data/avatar-catalog";

export type PlayerAvatarProps = {
  avatarKey: AvatarKey | string | null;
  frameKey: AvatarFrameKey | string | null;
  displayName: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
};

const sizeClasses = {
  sm: "size-11",
  md: "size-14",
  lg: "size-20",
  xl: "size-28",
} as const;

const frameClasses: Record<AvatarFrameKey, string> = {
  default: "border-slate-300 bg-slate-700 shadow-[inset_0_0_0_2px_rgb(255_255_255/0.25),0_4px_0_rgb(15_23_42/0.75)]",
  gold: "border-amber-300 bg-linear-to-br from-yellow-200 via-amber-500 to-yellow-800 shadow-[inset_0_0_0_2px_rgb(255_251_235/0.65),0_4px_0_rgb(120_53_15/0.9),0_0_18px_rgb(251_191_36/0.35)]",
  crystal: "border-violet-300 bg-linear-to-br from-fuchsia-300 via-violet-600 to-indigo-950 shadow-[inset_0_0_0_2px_rgb(245_208_254/0.5),0_4px_0_rgb(46_16_101/0.95),0_0_18px_rgb(168_85_247/0.4)]",
  emerald: "border-emerald-300 bg-linear-to-br from-lime-200 via-emerald-500 to-green-950 shadow-[inset_0_0_0_2px_rgb(220_252_231/0.55),0_4px_0_rgb(5_46_22/0.95),0_0_18px_rgb(52_211_153/0.35)]",
  silver: "border-slate-100 bg-linear-to-br from-white via-slate-400 to-slate-800 shadow-[inset_0_0_0_2px_rgb(255_255_255/0.7),0_4px_0_rgb(30_41_59/0.95),0_0_16px_rgb(203_213_225/0.3)]",
  flame: "border-orange-300 bg-linear-to-br from-yellow-200 via-orange-500 to-red-900 shadow-[inset_0_0_0_2px_rgb(255_237_213/0.55),0_4px_0_rgb(124_45_18/0.95),0_0_20px_rgb(249_115_22/0.45)]",
  celestial: "border-sky-200 bg-linear-to-br from-cyan-200 via-blue-600 to-indigo-950 shadow-[inset_0_0_0_2px_rgb(224_242_254/0.6),0_4px_0_rgb(23_37_84/0.95),0_0_20px_rgb(56_189_248/0.4)]",
};

/**
 * Composes one selected animal with its profile frame at every presentation size.
 * Frames stay separate from the portrait asset so settings and leaderboard rows
 * cannot drift into different visual treatments.
 */
export function PlayerAvatar({
  avatarKey,
  frameKey,
  displayName,
  size = "md",
  className,
  priority = false,
}: PlayerAvatarProps): React.ReactNode {
  const safeAvatarKey = normalizeAvatarKey(avatarKey);
  const safeFrameKey = normalizeAvatarFrameKey(frameKey);

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full border-[3px] p-1",
        sizeClasses[size],
        frameClasses[safeFrameKey],
        className,
      )}
      data-avatar-frame={safeFrameKey}
    >
      <span className="relative size-full overflow-hidden rounded-full bg-linear-to-b from-amber-50 to-amber-100 dark:from-slate-800 dark:to-slate-950">
        <Image
          src={`/images/avatars/${safeAvatarKey}.png`}
          alt={`${displayName}'s ${safeAvatarKey} avatar`}
          fill
          sizes="112px"
          className="object-contain"
          priority={priority}
        />
      </span>
    </span>
  );
}
