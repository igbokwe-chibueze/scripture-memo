import { z } from "@/lib/zod";

/** Bound public query work; malformed URL filters safely fall back to defaults. */
export const blogSearchSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  category: z.enum(["ALL", "GUIDE", "NEWS", "BEHIND_SCENES"]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type BlogSearch = z.infer<typeof blogSearchSchema>;
