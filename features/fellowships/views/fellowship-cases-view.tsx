import type { Metadata } from "next";
import { ClipboardListIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFellowshipCasePageAction } from "@/features/fellowships/actions/get-fellowship-case-page.action";
import { fellowshipCaseFiltersSchema } from "@/features/fellowships/schemas/fellowship-case-filters.schema";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Fellowship cases | Scripture Memo",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CASE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "ACTIVE",
  "RESTORED",
  "UPHELD",
  "SCHEDULED",
  "FORCED",
] as const;

/** Reads the first value so repeated query keys cannot produce ambiguous filters. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Formats case timestamps consistently in UTC for comparison and review. */
function formatTimestamp(value: Date): string {
  return value.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

/** Administrator searchable register for transfer, suspension, and closure cases. */
export async function FellowshipCasesView({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.ReactNode> {
  await getAdminSession();
  const query = await searchParams;
  const parsed = fellowshipCaseFiltersSchema.safeParse({
    page: first(query.page),
    query: first(query.query),
    fellowshipId: first(query.fellowshipId),
    kind: first(query.kind),
    status: first(query.status),
  });
  const filters = parsed.success ? parsed.data : fellowshipCaseFiltersSchema.parse({});
  const result = await getFellowshipCasePageAction(filters);
  if (!result.success || !result.data) {
    throw new Error("The Fellowship case register could not be loaded.");
  }
  const page = result.data;
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const preservedQuery = {
    ...(filters.query ? { query: filters.query } : {}),
    ...(filters.fellowshipId ? { fellowshipId: filters.fellowshipId } : {}),
    ...(filters.kind !== "ALL" ? { kind: filters.kind } : {}),
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
  };

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
              Administrator
            </span>
          }
          title="Fellowship cases"
          description="Search numbered transfer, suspension, and closure cases with their recorded action history."
          action={
            <NavigationButton
              href="/admin/fellowships"
              pendingLabel="Returning to Fellowships"
              variant="outline"
            >
              Back to Fellowships
            </NavigationButton>
          }
        />

        <form method="get" className="grid gap-3 rounded-3xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          {filters.fellowshipId && (
            <input type="hidden" name="fellowshipId" value={filters.fellowshipId} />
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="fellowship-case-query" className="font-bold">Case number or Fellowship</label>
            <Input
              id="fellowship-case-query"
              name="query"
              defaultValue={filters.query}
              maxLength={80}
              placeholder="FEL-000123 or Fellowship name"
              className="h-11 rounded-xl px-3"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fellowship-case-kind" className="font-bold">Case type</label>
            <select
              id="fellowship-case-kind"
              name="kind"
              defaultValue={filters.kind}
              className="h-11 w-full rounded-xl border bg-background px-3"
            >
              <option value="ALL">All types</option>
              <option value="TRANSFER">Transfer</option>
              <option value="SUSPENSION">Suspension</option>
              <option value="CLOSURE">Closure</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fellowship-case-status" className="font-bold">Status</label>
            <select
              id="fellowship-case-status"
              name="status"
              defaultValue={filters.status}
              className="h-11 w-full rounded-xl border bg-background px-3"
            >
              <option value="ALL">All statuses</option>
              {CASE_STATUSES.map((status) => (
                <option key={status} value={status}>{status.toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" className="min-h-11">
              <SearchIcon aria-hidden="true" />
              Search cases
            </Button>
            <NavigationButton href="/admin/fellowship-cases" pendingLabel="Clearing filters" variant="outline">
              Clear filters
            </NavigationButton>
          </div>
        </form>

        <section aria-label="Fellowship case results" className="space-y-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {page.total} {page.total === 1 ? "case" : "cases"} found
          </p>
          {page.items.length === 0 ? (
            <EmptyState
              icon={<ClipboardListIcon />}
              title="No matching cases"
              description="Try a different case number, Fellowship name, case type, or status."
            />
          ) : (
            <div className="grid gap-3">
              {page.items.map((governanceCase) => (
                <article key={governanceCase.id} className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-lg font-bold">{governanceCase.caseNumber}</h2>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        {governanceCase.kind.toLowerCase()}
                      </span>
                      <span className="rounded-full border px-2.5 py-1 text-xs font-bold">
                        {governanceCase.currentStatus.toLowerCase()}
                      </span>
                    </div>
                    <p className="truncate font-bold">{governanceCase.fellowshipName}</p>
                    <p className="text-sm text-muted-foreground">
                      Opened by {governanceCase.openedByName} · {formatTimestamp(governanceCase.openedAt)} UTC
                    </p>
                  </div>
                  <NavigationButton
                    href={`/admin/fellowship-cases/${encodeURIComponent(governanceCase.caseNumber)}`}
                    pendingLabel="Opening case"
                    variant="outline"
                    className="w-full shrink-0 sm:w-auto"
                  >
                    View case history
                  </NavigationButton>
                </article>
              ))}
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav aria-label="Case results pages" className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Page {filters.page} of {totalPages}</p>
            <div className="flex gap-2">
              {filters.page > 1 && (
                <NavigationButton
                  href={{ pathname: "/admin/fellowship-cases", query: { ...preservedQuery, page: filters.page - 1 } }}
                  pendingLabel="Loading previous cases"
                  variant="outline"
                >
                  Previous
                </NavigationButton>
              )}
              {filters.page < totalPages && (
                <NavigationButton
                  href={{ pathname: "/admin/fellowship-cases", query: { ...preservedQuery, page: filters.page + 1 } }}
                  pendingLabel="Loading more cases"
                  variant="outline"
                >
                  Next
                </NavigationButton>
              )}
            </div>
          </nav>
        )}
      </ResponsiveContainer>
    </main>
  );
}
