"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import type { ErrorCatalogEntry } from "@/lib/errors/error-catalog";

export type ErrorReferenceListProps = {
  entries: readonly ErrorCatalogEntry[];
};

/** Searchable ADMIN reference rendered entirely from the shared safe catalogue. */
export function ErrorReferenceList({ entries }: ErrorReferenceListProps): React.ReactNode {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return entries;
    return entries.filter((entry) => [
      entry.code,
      entry.title,
      entry.feature,
      entry.userMessage,
      entry.explanation,
      ...entry.commonCauses,
      ...entry.examples,
      ...entry.solutions,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  }, [entries, normalizedQuery]);

  return (
    <section className="space-y-5" aria-labelledby="error-reference-search-heading">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 id="error-reference-search-heading" className="font-heading text-lg font-semibold">
          Search error documentation
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by code, feature, message, cause, example, or solution.
        </p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="error-reference-search" className="sr-only">Search error reference</label>
          <Input
            id="error-reference-search"
            type="search"
            value={query}
            placeholder="Try WP-006, learner history, or archive…"
            className="min-h-11 pl-9"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          Showing {filteredEntries.length} of {entries.length} documented errors.
        </p>
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          title="No matching error code"
          description="Check the code or try a broader word from the error message."
          action={<Button type="button" variant="outline" onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredEntries.map((entry) => (
            <Card key={entry.code} className="h-full">
              <CardHeader className="border-b">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="font-mono tracking-wide">{entry.code}</Badge>
                  <Badge variant="outline">{entry.feature}</Badge>
                </div>
                <CardTitle><h2 className="mt-2 text-lg">{entry.title}</h2></CardTitle>
                <p className="text-sm font-medium text-foreground">{entry.userMessage}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h3 className="font-semibold">What it means</h3>
                  <p className="mt-1 leading-6 text-muted-foreground">{entry.explanation}</p>
                </div>
                <ReferenceList title="Common causes" items={entry.commonCauses} />
                <ReferenceList title="Examples" items={entry.examples} />
                <ReferenceList title="Possible solutions" items={entry.solutions} ordered />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

type ReferenceListProps = {
  title: string;
  items: readonly string[];
  ordered?: boolean;
};

/** Consistent compact list used by each error-reference section. */
function ReferenceList({ title, items, ordered = false }: ReferenceListProps): React.ReactNode {
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <List className={`mt-1 space-y-1 pl-5 leading-6 text-muted-foreground ${ordered ? "list-decimal" : "list-disc"}`}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </List>
    </div>
  );
}
