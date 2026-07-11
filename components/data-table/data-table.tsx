import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export type DataTableColumn<TData> = {
  /** Stable identifier used for React keys and responsive column targeting. */
  id: string;
  /** Human-readable heading announced for the column. */
  header: React.ReactNode;
  /** Converts one row into the content displayed in this column. */
  cell: (row: TData) => React.ReactNode;
  /** Optional alignment for numeric values or row actions. */
  align?: "left" | "center" | "right";
  /** Extends both header and data cells for feature-specific width constraints. */
  className?: string;
};

export type DataTableProps<TData> = {
  /** Ordered records displayed in the current table page. */
  data: TData[];
  /** Ordered column definitions controlling labels and cell rendering. */
  columns: DataTableColumn<TData>[];
  /** Returns a stable database-safe key for each record. */
  getRowKey: (row: TData) => React.Key;
  /** Accessible table description, visually hidden by default. */
  caption: string;
  /** Optional intentional empty state replacing the shared default message. */
  emptyState?: React.ReactNode;
  /** Extends the outer scroll container for page-specific layout needs. */
  className?: string;
};

const alignmentClasses: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Renders typed tabular data with semantic markup and mobile overflow behavior.
 *
 * Pagination, filtering, and data ownership deliberately stay outside this
 * component. Keeping the table presentational allows Server Components to query
 * only the required page and avoids forcing every administrative view client-side.
 */
export function DataTable<TData>({
  data,
  columns,
  getRowKey,
  caption,
  emptyState,
  className,
}: DataTableProps<TData>): React.ReactNode {
  if (data.length === 0) {
    return (
      emptyState ?? (
        <EmptyState
          title="Nothing here yet"
          description="Records will appear here when they become available."
        />
      )
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm",
        className,
      )}
    >
      <table className="w-full min-w-2xl border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  "h-11 px-4 font-semibold",
                  alignmentClasses[column.align ?? "left"],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              className="transition-colors hover:bg-muted/35"
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    "px-4 py-3 align-middle",
                    alignmentClasses[column.align ?? "left"],
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
