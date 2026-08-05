/** Stable keys persisted on user profiles and mapped to bundled local assets. */
export const AVATAR_KEYS = [
  "lion",
  "dove",
  "deer",
  "bull",
  "owl",
  "donkey",
  "rabbit",
  "fox",
  "panda",
  "elephant",
  "giraffe",
  "otter",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

/** The default frame is available to everyone; all other frames require Partner status. */
export const AVATAR_FRAME_KEYS = [
  "default",
  "gold",
  "crystal",
  "emerald",
  "silver",
  "flame",
  "celestial",
] as const;

export type AvatarFrameKey = (typeof AVATAR_FRAME_KEYS)[number];

export const DEFAULT_AVATAR_KEY: AvatarKey = "lion";
export const DEFAULT_AVATAR_FRAME_KEY: AvatarFrameKey = "default";

export type AvatarCatalogEntry = {
  key: AvatarKey;
  imagePath: string;
};

/** The catalog keeps presentation paths out of persisted database records. */
export const AVATAR_CATALOG: readonly AvatarCatalogEntry[] = AVATAR_KEYS.map(
  (key) => ({
    key,
    imagePath: `/images/avatars/${key}.png`,
  }),
);

/** Resolves untrusted or legacy stored keys to the safe bundled default. */
export function normalizeAvatarKey(value: string | null | undefined): AvatarKey {
  return AVATAR_KEYS.includes(value as AvatarKey)
    ? (value as AvatarKey)
    : DEFAULT_AVATAR_KEY;
}

/** Resolves untrusted or legacy stored frame keys to the fixed free frame. */
export function normalizeAvatarFrameKey(
  value: string | null | undefined,
): AvatarFrameKey {
  return AVATAR_FRAME_KEYS.includes(value as AvatarFrameKey)
    ? (value as AvatarFrameKey)
    : DEFAULT_AVATAR_FRAME_KEY;
}

