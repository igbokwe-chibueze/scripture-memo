import { z } from "@/lib/zod";

/** Bounds public query-string values before they reach the case repository. */
export const fellowshipCaseFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(80).default(""),
  fellowshipId: z.string().trim().min(1).max(64).optional(),
  kind: z.enum(["ALL", "TRANSFER", "SUSPENSION", "CLOSURE"]).default("ALL"),
  status: z.string().trim().max(30).default("ALL"),
});

/** Accepts only canonical displayed numbers before a case lookup. */
export const fellowshipCaseNumberSchema = z
  .string()
  .max(32)
  .regex(/^FEL-\d{6,}$/);

export type FellowshipCaseFilters = z.infer<typeof fellowshipCaseFiltersSchema>;
