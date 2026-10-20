/** Public UUIDs are navigation inputs; server sessions always determine the actor. */
import { z } from "@/lib/zod";

export const friendOperationSchema = z.enum([
  "request",
  "accept",
  "decline",
  "cancel",
  "unfriend",
  "block",
  "unblock",
]);

/** Every social mutation validates both its operation and target independently. */
export const friendMutationSchema = z
  .object({
    publicId: z
      .string()
      .uuid()
      .transform((value) => value.toLowerCase()),
    operation: friendOperationSchema,
  })
  .strict();

/** Lists use bounded pages; search is explicit, never a database query per keystroke. */
export const friendsPageSchema = z.object({
  tab: z
    .enum(["friends", "requests", "sent", "search", "blocked"])
    .catch("friends"),
  q: z.string().trim().max(50).catch(""),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export type FriendOperation = z.infer<typeof friendOperationSchema>;
export type FriendsPageInput = z.infer<typeof friendsPageSchema>;

/** Aggregated tab totals are validated before entering the browser-safe DTO. */
export const friendCountsSchema = z.object({
  friends: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
});
