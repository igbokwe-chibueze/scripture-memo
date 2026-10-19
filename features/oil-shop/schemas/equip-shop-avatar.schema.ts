import { z } from "zod";
import { AVATAR_KEYS } from "@/features/profile/data/avatar-catalog";

/** Clients submit an approved key only, never ownership claims or user identity. */
export const equipShopAvatarSchema = z.object({ avatarKey: z.enum(AVATAR_KEYS) }).strict();
