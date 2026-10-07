import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fellowshipModerationSearchSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import { FellowshipModerationManager } from "@/features/fellowships/components/fellowship-moderation-manager";
import { getFellowshipModerationListAction } from "@/features/fellowships/actions/get-fellowship-moderation-list.action";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Fellowships | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Renders the shared administrator Fellowship workspace with role-aware controls. */
export async function FellowshipModerationView({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>): Promise<React.ReactNode> {
  const session = await getAdminSession();
  const canManage = isSuperAdmin(session.user.role as UserRole | undefined);
  const rawSearch = await searchParams;
  const parsedSearch = fellowshipModerationSearchSchema.safeParse({
    query: firstSearchValue(rawSearch.q),
    status: firstSearchValue(rawSearch.status),
    page: firstSearchValue(rawSearch.page),
  });
  const filters = parsedSearch.success
    ? parsedSearch.data
    : { query: "", status: "ALL" as const, page: 1 };
  const result = await getFellowshipModerationListAction(filters);
  const data = result.success ? result.data : null;

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow={canManage ? "Super Admin workspace" : "Administrator workspace"}
          title="Fellowships"
          description="Find a community and review its status or case history. Only Super Admins can change Fellowship governance."
          action={
            <NavigationButton
              href="/admin/fellowship-cases"
              pendingLabel="Opening Fellowship cases"
              variant="outline"
            >
              View case logs
            </NavigationButton>
          }
        />

        <form
          className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)_auto] sm:items-end"
          role="search"
          action="/admin/fellowships"
        >
          <div className="space-y-2">
            <label htmlFor="fellowship-search" className="text-sm font-bold">
              Search Fellowships or leaders
            </label>
            <div className="relative">
              <SearchIcon
                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="fellowship-search"
                name="q"
                defaultValue={filters.query}
                placeholder="Name or leader"
                maxLength={50}
                className="min-h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="fellowship-status" className="text-sm font-bold">
              Status
            </label>
            <select
              id="fellowship-status"
              name="status"
              defaultValue={filters.status}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="ALL">All Fellowships</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="APPEAL_PENDING">Appeal needs review</option>
              <option value="CLOSING">Closing · recovery period</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <Button type="submit" className="min-h-11 w-full sm:w-auto">
            Search
          </Button>
        </form>

        {data ? (
          <FellowshipModerationManager
            data={data}
            query={filters.query}
            status={filters.status}
            viewerId={session.user.id}
            canManage={canManage}
          />
        ) : (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-card p-5 text-sm font-semibold text-destructive"
          >
            {result.message || "Fellowships could not be loaded. Refresh and try again."}
          </div>
        )}
      </ResponsiveContainer>
    </main>
  );
}

/** Reads the first value while rejecting ambiguous repeated query parameters. */
function firstSearchValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
