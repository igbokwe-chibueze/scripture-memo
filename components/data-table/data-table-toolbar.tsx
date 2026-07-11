"use client";

import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DataTableToolbarProps = {
  /** Controlled search text owned by the feature or URL state. */
  searchValue: string;
  /** Receives search changes; the owner decides whether and how to debounce. */
  onSearchChange: (value: string) => void;
  /** Describes the records users can search. */
  searchPlaceholder?: string;
  /** Additional filter controls rendered beside the search field. */
  filters?: React.ReactNode;
  /** Primary table action such as creating a new record. */
  action?: React.ReactNode;
  /** Extends the toolbar for page-specific spacing. */
  className?: string;
};

/**
 * Groups search, filters, and a primary action into a responsive table control.
 *
 * Search remains controlled so features can store filter state in the URL and
 * preserve it across navigation. Clearing is a full-size button with an explicit
 * label for assistive technology rather than a small, ambiguous icon target.
 */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search records…",
  filters,
  action,
  className,
}: DataTableToolbarProps): React.ReactNode {
  return (
    <div
      role="search"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm lg:flex-row lg:items-center",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-h-11 pl-9 pr-11"
        />
        {searchValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 min-h-11 min-w-11 -translate-y-1/2"
            onClick={() => onSearchChange("")}
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
