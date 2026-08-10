import type { Metadata } from "next";
import { AwardIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { AdminUserSearch } from "@/features/admin/components/admin-user-search";
import { UserAdminManager } from "@/features/admin/components/user-admin-manager";
import { adminRepository } from "@/features/admin/repositories/admin.repository";
import { adminUserFiltersSchema } from "@/features/admin/schemas/manage-user.schema";
import { getSuperAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Manage users | Scripture Memo",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Super Admin-only account search, role control, and suspension workspace. */
export async function UsersManagementView({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.ReactNode> {
  const session = await getSuperAdminSession();
  const query = await searchParams;
  const filters = adminUserFiltersSchema.parse({
    page: first(query.page),
    search: first(query.search),
  });
  const pageSize = 20;
  const result = await adminRepository.findUsers({
    page: filters.page,
    pageSize,
    search: filters.search || undefined,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

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
          title="Player accounts"
          description="Search players, protect access, and make audited role changes."
          action={
            <div className="flex flex-wrap gap-2">
              <NavigationButton
                href="/admin/badges#manual-badge-award"
                pendingLabel="Opening awards"
              >
                <AwardIcon aria-hidden="true" />
                Award badge
              </NavigationButton>
              <NavigationButton
                href="/admin"
                pendingLabel="Returning"
                variant="outline"
              >
                Back to admin
              </NavigationButton>
            </div>
          }
        />

        <AdminUserSearch defaultValue={filters.search} />

        {result.items.length > 0 ? (
          <UserAdminManager
            users={result.items}
            currentUserId={session.user.id}
          />
        ) : (
          <EmptyState
            icon={<UsersIcon />}
            title="No accounts found"
            description="Try another name or email address."
          />
        )}

        <nav
          aria-label="User account pages"
          className="flex flex-col gap-3 rounded-2xl border bg-card p-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"
        >
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {totalPages} · {result.total} accounts
          </span>
          <div className="grid grid-cols-2 gap-2">
            <NavigationButton
              href={{
                pathname: "/admin/users",
                query: {
                  ...(filters.search ? { search: filters.search } : {}),
                  page: Math.max(1, filters.page - 1),
                },
              }}
              pendingLabel="Loading"
              variant="outline"
              aria-disabled={filters.page <= 1}
              className={filters.page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              Previous
            </NavigationButton>
            <NavigationButton
              href={{
                pathname: "/admin/users",
                query: {
                  ...(filters.search ? { search: filters.search } : {}),
                  page: Math.min(totalPages, filters.page + 1),
                },
              }}
              pendingLabel="Loading"
              variant="outline"
              aria-disabled={filters.page >= totalPages}
              className={
                filters.page >= totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            >
              Next
            </NavigationButton>
          </div>
        </nav>
      </ResponsiveContainer>
    </main>
  );
}
