/** Stable first-party avatar products. Free portraits never become purchasable. */
import { AVATAR_CATALOG, isFreeAvatar, type AvatarKey } from "@/features/profile/data/avatar-catalog";

export const AVATAR_ITEM_TYPE = "AVATAR";
export const AVATAR_SHOP_CATALOG = AVATAR_CATALOG
  .filter((avatar) => !isFreeAvatar(avatar.key))
  .map((avatar) => ({
    avatarKey: avatar.key,
    slug: `avatar-${avatar.key}`,
    name: avatar.key,
    description: `A permanent ${avatar.key} profile avatar.`,
    cost: 250,
    grantQuantity: 1,
  }));

/** Resolve only approved first-party slugs; arbitrary catalogue rows cannot grant assets. */
export function avatarKeyForSlug(slug: string): AvatarKey | undefined {
  return AVATAR_SHOP_CATALOG.find((avatar) => avatar.slug === slug)?.avatarKey;
}
