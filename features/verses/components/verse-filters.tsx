"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

type TagOption = {
  name: string;
  slug: string;
};

export type VerseFiltersProps = {
  defaultSearch: string;
  defaultBook: string;
  defaultTag: string;
  defaultActive: "all" | "active" | "archived";
  defaultSort: "book-asc" | "book-desc";
  books: string[];
  tags: TagOption[];
};

/**
 * URL-backed verse filters with debounced text search and immediate selects.
 * The server-rendered view remains authoritative while this focused client
 * component provides responsive navigation without a redundant submit step.
 */
export function VerseFilters({
  defaultSearch,
  defaultBook,
  defaultTag,
  defaultActive,
  defaultSort,
  books,
  tags,
}: VerseFiltersProps): React.ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultSearch);
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback((params: URLSearchParams): void => {
    params.delete("page");
    startTransition(() => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [pathname, router]);

  function updateFilter(name: "book" | "tag" | "active" | "sort", value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault =
      value === "" ||
      (name === "active" && value === "all") ||
      (name === "sort" && value === "book-asc");

    if (isDefault) params.delete(name);
    else params.set(name, value);
    navigate(params);
  }

  useEffect(() => {
    if (search.trim() === defaultSearch) return;

    // WHY: Text entry is debounced to avoid one database request per keystroke;
    // bounded select choices can navigate immediately without excess requests.
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const value = search.trim();
      if (value) params.set("search", value);
      else params.delete("search");
      navigate(params);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [defaultSearch, navigate, search, searchParams]);

  return (
    <section
      className="relative grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      aria-label="Verse filters"
      aria-busy={isPending}
    >
      <div className="relative lg:col-span-2">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={search}
          placeholder="Search reference or book"
          className="min-h-11 pr-10 pl-9"
          aria-label="Search verses by reference or book"
          disabled={isPending}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <select value={defaultBook} className="min-h-11 rounded-lg border bg-background px-3 disabled:opacity-60" aria-label="Filter verses by book" disabled={isPending} onChange={(event) => updateFilter("book", event.target.value)}>
        <option value="">All books</option>
        {books.map((book) => <option key={book} value={book}>{book}</option>)}
      </select>
      <select value={defaultTag} className="min-h-11 rounded-lg border bg-background px-3 disabled:opacity-60" aria-label="Filter verses by tag" disabled={isPending} onChange={(event) => updateFilter("tag", event.target.value)}>
        <option value="">All tags</option>
        {tags.map((tag) => <option key={tag.slug} value={tag.slug}>{tag.name}</option>)}
      </select>
      <select value={defaultActive} className="min-h-11 rounded-lg border bg-background px-3 disabled:opacity-60" aria-label="Filter verses by publication status" disabled={isPending} onChange={(event) => updateFilter("active", event.target.value)}>
        <option value="all">All statuses</option>
        <option value="active">Published</option>
        <option value="archived">Archived</option>
      </select>
      <select value={defaultSort} className="min-h-11 rounded-lg border bg-background px-3 disabled:opacity-60" aria-label="Sort verses by book" disabled={isPending} onChange={(event) => updateFilter("sort", event.target.value)}>
        <option value="book-asc">Book A–Z</option>
        <option value="book-desc">Book Z–A</option>
      </select>

      {isPending && (
        <span className="absolute top-1 right-2 flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs text-muted-foreground" aria-live="polite">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Updating
        </span>
      )}
    </section>
  );
}
