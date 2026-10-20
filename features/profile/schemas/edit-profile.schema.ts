/** Profile editing shares Settings validation and the existing canonical username rules. */
import { z } from "@/lib/zod";
import { accountSettingsSchema } from "@/features/settings/schemas/update-user-settings.schema";
import { usernameSchema } from "./username.schema";

/** An omitted handle preserves an unclaimed username; account IDs are never accepted. */
export const editProfileSchema = accountSettingsSchema
  .pick({
    displayName: true,
    countryCode: true,
    avatarKey: true,
  })
  .extend({ username: usernameSchema.optional() })
  .strict();

export type EditProfileInput = z.infer<typeof editProfileSchema>;
