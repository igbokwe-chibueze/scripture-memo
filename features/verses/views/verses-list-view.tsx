import type { Metadata } from "next";
import Link from "next/link";
import { EditIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { VerseStatusAction } from "@/features/verses/components/verse-status-action";
import { getVersesListData } from "@/features/verses/lib/get-verses-list-data";
import { verseListFiltersSchema } from "@/features/verses/schemas/verse.schema";

export const metadata: Metadata = {
  title: "Manage verses | Scripture Memo",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type VerseRow = Awaited<ReturnType<typeof getVersesListData>>["items"][number];

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

  const columns: DataTableColumn<VerseRow>[] = [
    { id: "reference", header: "Reference", cell: (verse) => <span className="font-semibold">{verse.reference}</span> },
    { id: "book", header: "Book", cell: (verse) => `${verse.book} ${verse.chapter}` },
    {
      id: "tags",
      header: "Tags",
      cell: (verse) => (
        <div className="flex flex-wrap gap-1">
          {verse.tags.map(({ tag }) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}
        </div>
      ),
    },
    { id: "translations", header: "Translations", cell: (verse) => `${verse.translations.length}/3` },
    { id: "status", header: "Status", cell: (verse) => <Badge variant={verse.isActive ? "default" : "outline"}>{verse.isActive ? "Published" : "Archived"}</Badge> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (verse) => (
        <div className="flex justify-end gap-1">
          <Link href={`/admin/verses/${verse.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={`Edit ${verse.reference}`}>
            <EditIcon />
          </Link>
          <VerseStatusAction id={verse.id} isActive={verse.isActive} />
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Scripture library"
          description="Create, translate, publish, and archive curriculum verses."
          action={<Link href="/admin/verses/new" className={buttonVariants({ size: "lg" })}><PlusIcon /> Add verse</Link>}
        />

        <form method="get" action="/admin/verses" className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-7">
          <input name="search" defaultValue={filters.search} placeholder="Search reference or book" className="min-h-11 rounded-lg border bg-background px-3 lg:col-span-2" />
          <select name="book" defaultValue={filters.book ?? ""} className="min-h-11 rounded-lg border bg-background px-3">
            <option value="">All books</option>
            {result.books.map((book) => <option key={book} value={book}>{book}</option>)}
          </select>
          <select name="tag" defaultValue={filters.tag ?? ""} className="min-h-11 rounded-lg border bg-background px-3">
            <option value="">All tags</option>
            {result.tags.map((tag) => <option key={tag.slug} value={tag.slug}>{tag.name}</option>)}
          </select>
          <select name="active" defaultValue={filters.active} className="min-h-11 rounded-lg border bg-background px-3">
            <option value="all">All statuses</option><option value="active">Published</option><option value="archived">Archived</option>
          </select>
          <select name="sort" defaultValue={filters.sort} className="min-h-11 rounded-lg border bg-background px-3">
            <option value="book-asc">Book A–Z</option>
            <option value="book-desc">Book Z–A</option>
          </select>
          <button className={buttonVariants({ size: "lg" })}>Apply filters</button>
        </form>

        <DataTable
          data={result.items}
          columns={columns}
          getRowKey={(verse) => verse.id}
          caption="Admin Scripture verse library"
          emptyState={<EmptyState title="No verses found" description="Adjust the filters or create the first verse." action={<Link href="/admin/verses/new" className={buttonVariants()}>Create verse</Link>} />}
        />

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
