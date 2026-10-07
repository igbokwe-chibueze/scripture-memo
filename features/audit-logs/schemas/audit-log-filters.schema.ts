import { z } from "@/lib/zod";

/** Bounds untrusted query-string filters and prevents unbounded log reads. */
export const auditLogFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  action: z.string().trim().max(100).default(""),
  entityType: z.string().trim().max(80).default(""),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;
