import { z } from "zod";

/** Validates opaque notification identifiers before authentication or storage access. */
export const notificationIdSchema = z.object({
  notificationId: z.string().cuid(),
});
