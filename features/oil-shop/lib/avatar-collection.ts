import { FREE_AVATAR_KEYS, type AvatarKey } from "@/features/profile/data/avatar-catalog";

/** Include the three free portraits, permanent ownership and this acknowledged purchase once. */
export function getAvatarCollection(
  owned: readonly AvatarKey[],
  purchased?: AvatarKey,
): AvatarKey[] {
  return [...new Set([
    ...FREE_AVATAR_KEYS,
    ...owned,
    ...(purchased ? [purchased] : []),
  ])];
}
