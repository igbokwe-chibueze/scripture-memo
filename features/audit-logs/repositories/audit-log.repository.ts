import "server-only";

import { prisma } from "@/lib/prisma";
import type { AuditLogFilters } from "@/features/audit-logs/schemas/audit-log-filters.schema";
import { getSafePlatformSettingsSummary } from "@/features/audit-logs/lib/safe-audit-summary";

const AUDIT_PAGE_SIZE = 25;

/** Read-only access to bounded audit records; no update or delete API exists. */
export const auditLogRepository = {
  /** Returns one newest-first page with actor names and no private metadata. */
  async findPage(filters: AuditLogFilters): Promise<{
    total: number;
    pageSize: number;
    items: Array<{
      id: string;
      action: string;
      entityType: string;
      createdAt: Date;
      actorName: string;
      safeSummary: string | null;
    }>;
  }> {
    const where = {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
    };

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (filters.page - 1) * AUDIT_PAGE_SIZE,
        take: AUDIT_PAGE_SIZE,
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          metadata: true,
          actor: {
            select: {
              name: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      total,
      pageSize: AUDIT_PAGE_SIZE,
      items: logs.map(({ actor, metadata, ...log }) => ({
        ...log,
        actorName:
          actor?.profile?.displayName ||
          actor?.name ||
          "System or removed account",
        safeSummary:
          log.action === "PLATFORM_SETTINGS_UPDATED"
            ? getSafePlatformSettingsSummary(metadata)
            : null,
      })),
    };
  },
} as const;
