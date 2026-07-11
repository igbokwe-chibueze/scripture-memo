"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataTablePaginationProps = {
  /** One-based active page displayed to the user. */
  page: number;
  /** Total number of available pages after server-side filtering. */
  pageCount: number;
  /** Requests a new valid one-based page from the owning feature. */
  onPageChange: (page: number) => void;
  /** Optional total record count used for additional context. */
  totalItems?: number;
  /** Prevents navigation while a page request is pending. */
  isPending?: boolean;
  /** Extends layout styling for table-specific placement. */
  className?: string;
};

/**
 * Provides touch-friendly previous/next navigation for paginated server data.
 *
 * Page values are clamped before being emitted, ensuring rapid taps cannot ask
 * an owning repository for an invalid page even before its own validation runs.
 */
export function DataTablePagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  isPending = false,
  className,
}: DataTablePaginationProps): React.ReactNode {
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);

  return (
    <nav
      aria-label="Table pagination"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page <span className="font-semibold text-foreground">{safePage}</span> of{" "}
        <span className="font-semibold text-foreground">{safePageCount}</span>
        {typeof totalItems === "number" && ` · ${totalItems} total`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={isPending || safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
        >
          <ChevronLeftIcon aria-hidden="true" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={isPending || safePage >= safePageCount}
          onClick={() => onPageChange(Math.min(safePageCount, safePage + 1))}
        >
          Next
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
