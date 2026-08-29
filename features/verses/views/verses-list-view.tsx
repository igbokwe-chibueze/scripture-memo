import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { VerseImportDialog } from "@/features/verses/components/verse-import-dialog";
import { VerseFilters } from "@/features/verses/components/verse-filters";
import {
  VerseLibraryTable,
  type VerseLibraryRow,
} from "@/features/verses/components/verse-library-table";
import { getVersesListData } from "@/features/verses/lib/get-verses-list-data";
import { verseListFiltersSchema } from "@/features/verses/schemas/verse.schema";

export const metadata: Metadata = {
  title: "Manage verses | Scripture Memo",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** ADMIN-only paginated verse library with URL-persisted filters. */
export async function VersesListView({ searchParams }: { searchParams: SearchParams }): Promise<React.ReactNode> {
  const query = await searchParams;
  const filters = verseListFiltersSchema.parse({
    page: first(query.page),
    search: first(query.search),
    book: first(query.book),
    tag: first(query.tag),
    active: first(query.active),
    sort: first(query.sort),
  });
  const result = await getVersesListData({
    page: filters.page,
    pageSize: 20,
    search: filters.search || undefined,
    book: filters.book || undefined,
    tag: filters.tag || undefined,
    active: filters.active === "all" ? undefined : filters.active === "active",
    sort: filters.sort,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / 20));

  // Only the fields displayed by the interactive table cross the Server-to-
  // Client boundary. Dates and unused relation fields stay on the server.
  const rows: VerseLibraryRow[] = result.items.map((verse) => ({
    id: verse.id,
    reference: verse.reference,
    book: verse.book,
    chapter: verse.chapter,
    isActive: verse.isActive,
    translations: verse.translations,
    tags: verse.tags,
    waypoints: verse.waypoints,
    packs: verse.packs,
  }));

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Scripture library"
          description="Create, translate, publish, and archive curriculum verses."
          action={(
            <div className="flex flex-wrap gap-2">
              <VerseImportDialog />
              <Link href="/admin/verses/new" className={buttonVariants({ size: "lg" })}><PlusIcon /> Add verse</Link>
            </div>
          )}
        />

        <VerseFilters
          key={`${filters.search ?? ""}:${filters.book ?? ""}:${filters.tag ?? ""}:${filters.active}:${filters.sort}`}
          defaultSearch={filters.search ?? ""}
          defaultBook={filters.book ?? ""}
          defaultTag={filters.tag ?? ""}
          defaultActive={filters.active}
          defaultSort={filters.sort}
          books={result.books}
          tags={result.tags}
        />

        <VerseLibraryTable rows={rows} />

        <nav aria-label="Verse pages" className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {filters.page} of {totalPages} · {result.total} verses</span>
          <div className="flex gap-2">
            {filters.page > 1 && <Link className={buttonVariants({ variant: "outline" })} href={{ pathname: "/admin/verses", query: { ...query, page: filters.page - 1 } }}>Previous</Link>}
            {filters.page < totalPages && <Link className={buttonVariants({ variant: "outline" })} href={{ pathname: "/admin/verses", query: { ...query, page: filters.page + 1 } }}>Next</Link>}
          </div>
        </nav>
      </ResponsiveContainer>
    </main>
  );
}
