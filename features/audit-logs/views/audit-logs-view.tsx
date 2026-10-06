import type { Metadata } from "next";
import { ClipboardListIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { auditLogRepository } from "@/features/audit-logs/repositories/audit-log.repository";
import { auditLogFiltersSchema } from "@/features/audit-logs/schemas/audit-log-filters.schema";
import { getSuperAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Audit log | Scripture Memo",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Keeps the server query deterministic when a query key is repeated. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Renders a stable timestamp so administrators can compare audit events. */
function formatAuditTimestamp(value: Date): string {
  return value.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

/** Super Admin audit history with bounded filters and privacy-limited fields. */
export async function AuditLogsView({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.ReactNode> {
  await getSuperAdminSession();
  const query = await searchParams;
  const filters = auditLogFiltersSchema.parse({
    page: first(query.page),
    action: first(query.action),
    entityType: first(query.entityType),
  });
  const result = await auditLogRepository.findPage(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const preservedQuery = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
  };

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
              Super Admin
            </span>
          }
          title="Audit log"
          description="Review newest administrative and system events. Records are immutable; private IP addresses and raw metadata are withheld from this view."
          action={
            <NavigationButton
              href="/admin"
              pendingLabel="Returning to admin"
              variant="outline"
            >
              Back to admin
            </NavigationButton>
          }
        />

        <form
          method="get"
          className="grid gap-3 rounded-3xl border bg-card p-4 sm:grid-cols-3 sm:items-end"
        >
          <div className="space-y-1.5">
            <label htmlFor="audit-action" className="font-bold">
              Action
            </label>
            <Input
              id="audit-action"
              name="action"
              defaultValue={filters.action}
              maxLength={100}
              className="h-11 rounded-xl px-3"
              placeholder="Exact event name"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="audit-entity-type" className="font-bold">
              Record type
            </label>
            <Input
              id="audit-entity-type"
              name="entityType"
              defaultValue={filters.entityType}
              maxLength={80}
              className="h-11 rounded-xl px-3"
              placeholder="User, Verse, PlatformSettings…"
            />
          </div>
          <Button type="submit" className="min-h-11">
            Filter audit log
          </Button>
        </form>

        {result.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardListIcon />}
            title="No audit events found"
            description="Change or clear the filters to review other recorded events."
          />
        ) : (
          <section aria-label="Audit events" className="space-y-3">
            {result.items.map((item) => (
              <article
                key={item.id}
                className="grid gap-2 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="break-words font-heading text-lg font-bold">{item.action}</h2>
                  <p className="text-sm text-muted-foreground">
                    {item.entityType} · {item.actorName}
                  </p>
                  {item.safeSummary && (
                    <p className="mt-2 break-words text-sm">
                      {item.safeSummary}
                    </p>
                  )}
                </div>
                <time
                  dateTime={item.createdAt.toISOString()}
                  className="text-sm text-muted-foreground sm:text-right"
                >
                  {formatAuditTimestamp(item.createdAt)} UTC
                </time>
              </article>
            ))}
          </section>
        )}

        <nav
          aria-label="Audit log pages"
          className="flex flex-col gap-3 rounded-2xl border bg-card p-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"
        >
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {totalPages} · {result.total} events
          </span>
          <div className="grid grid-cols-2 gap-2">
            {filters.page <= 1 ? (
              <Button variant="outline" disabled>
                Previous
              </Button>
            ) : (
              <NavigationButton
                href={{
                  pathname: "/admin/audit-logs",
                  query: { ...preservedQuery, page: filters.page - 1 },
                }}
                pendingLabel="Loading audit page"
                variant="outline"
              >
                Previous
              </NavigationButton>
            )}
            {filters.page >= totalPages ? (
              <Button variant="outline" disabled>
                Next
              </Button>
            ) : (
              <NavigationButton
                href={{
                  pathname: "/admin/audit-logs",
                  query: { ...preservedQuery, page: filters.page + 1 },
                }}
                pendingLabel="Loading audit page"
                variant="outline"
              >
                Next
              </NavigationButton>
            )}
          </div>
        </nav>
      </ResponsiveContainer>
    </main>
  );
}
