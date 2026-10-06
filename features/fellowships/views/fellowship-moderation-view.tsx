import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { Input } from "@/components/ui/input";
import { FellowshipModerationManager } from "@/features/fellowships/components/fellowship-moderation-manager";
import { getFellowshipModerationListAction } from "@/features/fellowships/actions/get-fellowship-moderation-list.action";
import { getSuperAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Fellowship recovery | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Renders the private, bounded Super Admin recovery workspace. */
export async function FellowshipModerationView({
  searchParams,
}: Readonly<{ searchParams: Promise<{ q?: string }> }>): Promise<React.ReactNode> {
  await getSuperAdminSession();
  const rawSearch = await searchParams;
  const query = rawSearch.q?.trim().slice(0, 50) ?? "";
  const result = await getFellowshipModerationListAction({
    query,
  });
  const fellowships = result.success ? result.data ?? [] : [];

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Super Admin only"
          title="Fellowship recovery"
          description="Transfer leadership when a community cannot be managed, or close a fellowship in an urgent safety case. Every action requires a reason and is audited."
        />
        <form className="relative max-w-xl" role="search">
          <SearchIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="fellowship-search" className="sr-only">Search Fellowships</label>
          <Input
            id="fellowship-search"
            name="q"
            defaultValue={query}
            placeholder="Search Fellowships"
            maxLength={50}
            className="min-h-12 rounded-2xl pl-12"
          />
        </form>
        <FellowshipModerationManager fellowships={fellowships} />
      </ResponsiveContainer>
    </main>
  );
}
